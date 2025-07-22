
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Save, User, Globe, Building, BookOpen } from 'lucide-react';

interface ProfileTabProps {
  profileData: any;
  setProfileData: (data: any) => void;
  businessData: any;
  setBusinessData: (data: any) => void;
  loading: boolean;
  handleUpdateProfile: () => void;
  handleUpdateBusiness: () => void;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({
  profileData,
  setProfileData,
  businessData,
  setBusinessData,
  loading,
  handleUpdateProfile,
  handleUpdateBusiness
}) => {
  return (
    <div className="space-y-8">
      {/* Basic Information */}
      <Card style={{ backgroundColor: '#1F2937' }} className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <User className="h-5 w-5" />
            Basic Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-foreground">First Name</Label>
              <Input
                id="firstName"
                value={profileData.first_name || ''}
                onChange={(e) => setProfileData({...profileData, first_name: e.target.value})}
                placeholder="Enter your first name"
                className="bg-input border-border text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-foreground">Last Name</Label>
              <Input
                id="lastName"
                value={profileData.last_name || ''}
                onChange={(e) => setProfileData({...profileData, last_name: e.target.value})}
                placeholder="Enter your last name"
                className="bg-input border-border text-foreground"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-foreground">Full Name</Label>
            <Input
              id="fullName"
              value={profileData.full_name || ''}
              onChange={(e) => setProfileData({...profileData, full_name: e.target.value})}
              placeholder="Enter your full name"
              className="bg-input border-border text-foreground"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-foreground">Phone Number</Label>
            <Input
              id="phone"
              value={profileData.phone || ''}
              onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
              placeholder="Enter your phone number"
              className="bg-input border-border text-foreground"
            />
          </div>
          <Button 
            onClick={handleUpdateProfile}
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Profile Changes
          </Button>
        </CardContent>
      </Card>

      {/* Social Media & Website */}
      <Card style={{ backgroundColor: '#1F2937' }} className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Globe className="h-5 w-5" />
            Social Media & Website
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="website" className="text-foreground">Website URL</Label>
            <Input
              id="website"
              value={profileData.website_url || ''}
              onChange={(e) => setProfileData({...profileData, website_url: e.target.value})}
              placeholder="https://example.com"
              className="bg-input border-border text-foreground"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="socialMedia" className="text-foreground">Social Media Links</Label>
            <Textarea
              id="socialMedia"
              value={profileData.social_media_links || ''}
              onChange={(e) => setProfileData({...profileData, social_media_links: e.target.value})}
              placeholder="Enter your social media links (one per line)"
              rows={4}
              className="bg-input border-border text-foreground"
            />
          </div>
        </CardContent>
      </Card>

      {/* Business Information */}
      <Card style={{ backgroundColor: '#1F2937' }} className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Building className="h-5 w-5" />
            Business Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="businessName" className="text-foreground">Business Name</Label>
            <Input
              id="businessName"
              value={businessData.business_name || ''}
              onChange={(e) => setBusinessData({...businessData, business_name: e.target.value})}
              placeholder="Enter your business name"
              className="bg-input border-border text-foreground"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="businessType" className="text-foreground">Business Type</Label>
            <Input
              id="businessType"
              value={businessData.business_type || ''}
              onChange={(e) => setBusinessData({...businessData, business_type: e.target.value})}
              placeholder="e.g., Restaurant, Salon, Gym"
              className="bg-input border-border text-foreground"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="businessDescription" className="text-foreground">Business Description</Label>
            <Textarea
              id="businessDescription"
              value={businessData.business_description || ''}
              onChange={(e) => setBusinessData({...businessData, business_description: e.target.value})}
              placeholder="Describe your business..."
              rows={4}
              className="bg-input border-border text-foreground"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="businessAddress" className="text-foreground">Business Address</Label>
              <Textarea
                id="businessAddress"
                value={businessData.business_address || ''}
                onChange={(e) => setBusinessData({...businessData, business_address: e.target.value})}
                placeholder="Enter your business address"
                rows={3}
                className="bg-input border-border text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactInfo" className="text-foreground">Contact Information</Label>
              <Textarea
                id="contactInfo"
                value={businessData.contact_info || ''}
                onChange={(e) => setBusinessData({...businessData, contact_info: e.target.value})}
                placeholder="Phone, email, etc."
                rows={3}
                className="bg-input border-border text-foreground"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="businessHours" className="text-foreground">Business Hours</Label>
              <Textarea
                id="businessHours"
                value={businessData.business_hours || ''}
                onChange={(e) => setBusinessData({...businessData, business_hours: e.target.value})}
                placeholder="Monday-Friday: 9AM-5PM, etc."
                rows={4}
                className="bg-input border-border text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="services" className="text-foreground">Services Offered</Label>
              <Textarea
                id="services"
                value={businessData.services_offered || ''}
                onChange={(e) => setBusinessData({...businessData, services_offered: e.target.value})}
                placeholder="List your main services..."
                rows={4}
                className="bg-input border-border text-foreground"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="policies" className="text-foreground">Booking Policies</Label>
              <Textarea
                id="policies"
                value={businessData.booking_policies || ''}
                onChange={(e) => setBusinessData({...businessData, booking_policies: e.target.value})}
                placeholder="Cancellation policy, requirements, etc."
                rows={4}
                className="bg-input border-border text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="specialRequirements" className="text-foreground">Special Requirements</Label>
              <Textarea
                id="specialRequirements"
                value={businessData.special_requirements || ''}
                onChange={(e) => setBusinessData({...businessData, special_requirements: e.target.value})}
                placeholder="Any special requirements or notes..."
                rows={4}
                className="bg-input border-border text-foreground"
              />
            </div>
          </div>
          <Button 
            onClick={handleUpdateBusiness}
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Business Changes
          </Button>
        </CardContent>
      </Card>

      {/* Business Knowledge Base */}
      <Card style={{ backgroundColor: '#1F2937' }} className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <BookOpen className="h-5 w-5" />
            Business Knowledge Base
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="faq" className="text-foreground">Frequently Asked Questions</Label>
            <Textarea
              id="faq"
              value={businessData.faq || ''}
              onChange={(e) => setBusinessData({...businessData, faq: e.target.value})}
              placeholder="Common questions and answers..."
              rows={6}
              className="bg-input border-border text-foreground"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="additionalInfo" className="text-foreground">Additional Information</Label>
            <Textarea
              id="additionalInfo"
              value={businessData.additional_info || ''}
              onChange={(e) => setBusinessData({...businessData, additional_info: e.target.value})}
              placeholder="Any other important information about your business..."
              rows={6}
              className="bg-input border-border text-foreground"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
