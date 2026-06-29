import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'
import { validateStripeMode } from '../_shared/stripeValidation.ts'
import { resolveRefundedCents } from '../_shared/taxReport.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the user from the request
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      throw new Error('Authentication required')
    }

    // F-TAX-13: align this tax fn with the gated siblings (get-tax-settings:56,
    // manage-tax-registrations:132). It returns tax revenue/analytics, a paid
    // tax-compliance feature. Trial users have subscription_tier='professional'
    // (active_trial -> 'professional'), so this does not block onboarding; only
    // expired/cancelled (NULL) + free/starter are gated. The supabaseClient here is
    // RLS-scoped to the caller (anon key + caller Authorization), so users.select on
    // the caller's own id is permitted.
    const { data: tierData, error: tierError } = await supabaseClient
      .from('users')
      .select('subscription_tier')
      .eq('id', user.id)
      .single()
    if (tierError) {
      throw new Error(`Failed to fetch user data: ${tierError.message}`)
    }
    if (!tierData?.subscription_tier || !['professional', 'enterprise'].includes(tierData.subscription_tier)) {
      return new Response(
        JSON.stringify({
          success: false,
          code: 'UPGRADE_REQUIRED',
          error: 'Tax compliance features require Professional or Enterprise subscription'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    const { calendar_id, start_date, end_date } = await req.json()

    if (!calendar_id) {
      throw new Error('Calendar ID is required')
    }

    // Parse dates with fallbacks
    const startDate = start_date ? new Date(start_date) : new Date(new Date().getFullYear(), 0, 1)
    const endDate = end_date ? new Date(end_date) : new Date()

    console.log('Fetching tax analytics for calendar:', calendar_id)
    console.log('Date range:', startDate.toISOString(), 'to', endDate.toISOString())

    // Verify calendar ownership
    const { data: calendar, error: calendarError } = await supabaseClient
      .from('calendars')
      .select('id, user_id')
      .eq('id', calendar_id)
      .eq('user_id', user.id)
      .single()

    if (calendarError || !calendar) {
      throw new Error('Calendar not found or access denied')
    }

    // F-TAX-06 class: scope the business Stripe account by account_owner_id to
    // match the sibling tax fns (a member sub-account, where user_id !=
    // account_owner_id, otherwise resolves the wrong/empty bsa). The calendar
    // ownership check above is the IDOR guard; this only resolves the caller's
    // own business owner.
    const { data: ownerData } = await supabaseClient
      .from('users')
      .select('account_owner_id')
      .eq('id', user.id)
      .single()
    const accountOwnerId = ownerData?.account_owner_id || user.id

    // Get business Stripe account for country detection
    const { data: stripeAccount } = await supabaseClient
      .from('business_stripe_accounts')
      .select('*')
      .eq('account_owner_id', accountOwnerId)
      .eq('charges_enabled', true)
      .maybeSingle()

    const businessCountry = stripeAccount?.country || 'NL'
    const businessCurrency = stripeAccount?.currency || 'eur'

    // Get tax-enabled services for this calendar
    const { data: taxEnabledServices, error: servicesError } = await supabaseClient
      .from('service_types')
      .select('id, name, price, tax_enabled, applicable_tax_rate, tax_behavior')
      .eq('calendar_id', calendar_id)
      .eq('tax_enabled', true)
      .eq('is_active', true)

    if (servicesError) {
      console.error('Error fetching tax-enabled services:', servicesError)
      throw servicesError
    }

    console.log('Found tax-enabled services:', taxEnabledServices?.length || 0)

    if (!taxEnabledServices || taxEnabledServices.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        data: {
          overview: {
            total_tax_collected: 0,
            total_revenue: 0,
            tax_rate: 0,
            currency: businessCurrency.toUpperCase(),
            collection_period: 'No tax-enabled services'
          },
          monthly_trends: [],
          service_performance: [],
          compliance_status: {
            tax_collection_active: false,
            services_configured: 0,
            registrations_active: 0
          }
        }
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const serviceIds = taxEnabledServices.map(s => s.id)

    // Get completed bookings for tax-enabled services in date range
    const { data: completedBookings, error: bookingsError } = await supabaseClient
      .from('bookings')
      .select(`
        id,
        service_type_id,
        total_price,
        start_time,
        service_types!inner (
          name,
          tax_enabled,
          applicable_tax_rate,
          tax_behavior
        )
      `)
      .eq('calendar_id', calendar_id)
      .in('service_type_id', serviceIds)
      .eq('status', 'confirmed')
      .gte('start_time', startDate.toISOString())
      .lte('start_time', endDate.toISOString())

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError)
      throw bookingsError
    }

    console.log('Found completed bookings:', completedBookings?.length || 0)

    // F-TAX-17: refunds must be reflected here too, so analytics agree with the
    // tax reports. Build a bookingId -> refunded-FRACTION map by reading the
    // AUTHORITATIVE refund from Stripe (charge.amount_refunded) for the matching
    // booking_payments, mode-pinned via the server-derived key (T1 invariant; no
    // body-driven key). We prorate on the payment's charged amount, then apply the
    // same kept-fraction to the analytics revenue/tax (which are derived from
    // bookings.total_price + the service rate, not from the PI). When no refund
    // exists the fraction is 1.0 and nothing changes.
    const refundFractionByBooking: Record<string, number> = {}
    const bookingIds = (completedBookings || []).map(b => b.id)
    if (bookingIds.length > 0) {
      // SECURITY (F-CLOSE-04 mode-bypass class): mode/key is server-derived from
      // STRIPE_MODE, never from the request body.
      const test_mode = validateStripeMode().mode === 'test'
      const { data: paymentsForBookings } = await supabaseClient
        .from('booking_payments')
        .select('booking_id, stripe_payment_intent_id, stripe_account_id, amount_cents')
        .in('booking_id', bookingIds)
        .in('status', ['succeeded', 'completed', 'refunded'])

      if (paymentsForBookings && paymentsForBookings.length > 0) {
        const stripeSecretKey = test_mode
          ? Deno.env.get('STRIPE_SECRET_KEY_TEST')
          : Deno.env.get('STRIPE_SECRET_KEY_LIVE')
        if (stripeSecretKey) {
          const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' })
          for (const pay of paymentsForBookings) {
            try {
              const pi = await stripe.paymentIntents.retrieve(
                pay.stripe_payment_intent_id,
                { expand: ['latest_charge'] },
                { stripeAccount: pay.stripe_account_id }
              )
              const refundedCents = resolveRefundedCents(pi)
              const chargedCents = pi.amount || pay.amount_cents || 0
              if (refundedCents > 0 && chargedCents > 0) {
                const keptFraction = Math.max(0, (chargedCents - refundedCents) / chargedCents)
                refundFractionByBooking[pay.booking_id] = keptFraction
              }
            } catch (refundErr) {
              console.log('Could not read refund for PI', pay.stripe_payment_intent_id, (refundErr as Error)?.message)
            }
          }
        }
      }
    }

    // Calculate tax analytics
    let totalRevenue = 0
    let totalTaxCollected = 0
    let totalRefunded = 0
    const monthlyData: { [key: string]: { revenue: number, tax: number, bookings: number } } = {}
    const serviceStats: { [key: string]: {
      name: string,
      revenue: number,
      tax: number,
      bookings: number,
      tax_rate: number
    } } = {}

    completedBookings?.forEach(booking => {
      const grossRevenue = Number(booking.total_price) || 0
      const taxRate = booking.service_types.applicable_tax_rate || 21

      // F-TAX-17: scale revenue + tax by the kept fraction (1.0 when not refunded),
      // so a refunded booking is not counted at full gross+VAT. The rate is
      // unchanged; both revenue and tax scale by the same fraction, so the row
      // stays internally consistent.
      const keptFraction = refundFractionByBooking[booking.id] ?? 1
      const revenue = grossRevenue * keptFraction
      totalRefunded += grossRevenue - revenue

      let taxAmount = 0
      if (booking.service_types.tax_behavior === 'inclusive') {
        // Tax is included in the price
        taxAmount = revenue * (taxRate / (100 + taxRate))
      } else {
        // Tax is exclusive (added on top)
        taxAmount = revenue * (taxRate / 100)
      }

      totalRevenue += revenue
      totalTaxCollected += taxAmount

      // Monthly breakdown
      const monthKey = new Date(booking.start_time).toISOString().substring(0, 7) // YYYY-MM
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { revenue: 0, tax: 0, bookings: 0 }
      }
      monthlyData[monthKey].revenue += revenue
      monthlyData[monthKey].tax += taxAmount
      monthlyData[monthKey].bookings += 1

      // Service breakdown
      const serviceKey = booking.service_type_id
      if (!serviceStats[serviceKey]) {
        serviceStats[serviceKey] = {
          name: booking.service_types.name,
          revenue: 0,
          tax: 0,
          bookings: 0,
          tax_rate: taxRate
        }
      }
      serviceStats[serviceKey].revenue += revenue
      serviceStats[serviceKey].tax += taxAmount
      serviceStats[serviceKey].bookings += 1
    })

    // Format monthly trends
    const monthlyTrends = Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        revenue: data.revenue,
        tax_collected: data.tax,
        bookings: data.bookings
      }))

    // Format service performance
    const servicePerformance = Object.values(serviceStats)
      .sort((a, b) => b.revenue - a.revenue)
      .map(service => ({
        service_name: service.name,
        total_bookings: service.bookings,
        total_revenue: service.revenue,
        tax_collected: service.tax,
        tax_rate: service.tax_rate,
        avg_revenue_per_booking: service.bookings > 0 ? service.revenue / service.bookings : 0
      }))

    // Calculate average tax rate
    const avgTaxRate = totalRevenue > 0 ? (totalTaxCollected / totalRevenue) * 100 : 0

    const response = {
      success: true,
      data: {
        overview: {
          total_tax_collected: totalTaxCollected,
          total_revenue: totalRevenue,
          // F-TAX-17: revenue/tax above are NET OF REFUNDS; total_refunded surfaces
          // the removed amount so analytics agree with the tax reports.
          total_refunded: totalRefunded,
          tax_rate: avgTaxRate,
          currency: businessCurrency.toUpperCase(),
          collection_period: `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
          business_country: businessCountry
        },
        monthly_trends: monthlyTrends,
        service_performance: servicePerformance,
        compliance_status: {
          tax_collection_active: taxEnabledServices.length > 0,
          services_configured: taxEnabledServices.length,
          registrations_active: stripeAccount?.onboarding_completed ? 1 : 0,
          stripe_connected: !!stripeAccount?.charges_enabled
        }
      }
    }

    console.log('Tax analytics calculated successfully')
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in get-tax-analytics:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})