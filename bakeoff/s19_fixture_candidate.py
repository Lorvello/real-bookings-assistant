"""Isolated S19 seed candidate. NOT connected to any runner or approved for execution.

This only constructs a truthful source booking after a caller supplies a separately
created fixture service. It does not prove ownership, availability, journal/cleanup,
database readback, date policy, or runner hash binding. Those are mandatory gates.
"""
from datetime import datetime, timedelta
from decimal import Decimal, InvalidOperation


def install_s19_prep(core, read_services):
    """Wrap a specific core instance; all other scenarios use the original method."""
    original = core.prep_scenario

    def prepare(sc_id, bind, fx, phone):
        if sc_id != 'S19':
            return original(sc_id, bind, fx, phone)
        try:
            bram, iris = fx['calB'], fx['calA']
            svc, a_svc, owner = fx['svc_bram_knippen'], fx['svc_knip'], fx['owner']
            b_services, a_services = fx['services']['B'], fx['services']['A']
            items = bind['prep']
            valid = (isinstance(bram, str) and bool(bram) and isinstance(iris, str) and bool(iris)
                     and bram != iris and bind['cal'] == bram and bind['cal_bram'] == bram and bind['cal_iris'] == iris
                     and isinstance(owner, str) and bool(owner.strip()) and owner == owner.strip()
                     and isinstance(a_svc, str) and bool(a_svc.strip()) and a_svc == a_svc.strip()
                     and isinstance(svc, str) and bool(svc.strip()) and svc == svc.strip()
                     and isinstance(b_services, list) and b_services.count(svc) == 1
                     and len(b_services) >= 2 and svc != b_services[0]
                     and isinstance(a_services, list) and a_services.count(a_svc) == 1 and svc not in a_services
                     and isinstance(items, list) and len(items) == 1 and len(items[0]) == 5
                     and items[0][0] == 'booking' and items[0][1] == bram)
        except (KeyError, TypeError, IndexError):
            valid = False
        if not valid:
            raise ValueError('S19 fixture service binding is incomplete or inconsistent')

        _, cal, date, time_, name = items[0]
        try:
            start_time = datetime.strptime(f'{date} {time_}', '%Y-%m-%d %H:%M')
            if start_time.strftime('%Y-%m-%d %H:%M') != f'{date} {time_}' or (start_time + timedelta(minutes=30)).date() != start_time.date():
                raise ValueError('invalid booking interval')
        except (TypeError, ValueError):
            raise ValueError('S19 source time is invalid') from None
        proof = read_services(a_svc, svc)
        if not isinstance(proof, list) or len(proof) != 2:
            raise ValueError('S19 service readback incomplete')
        by_id = {row.get('id'): row for row in proof if isinstance(row, dict)}
        if len(by_id) != 2 or set(by_id) != {a_svc, svc}:
            raise ValueError('S19 service readback identities invalid')
        try:
            for service_id, calendar in ((a_svc, iris), (svc, bram)):
                row = by_id[service_id]
                if (row.get('calendar_id') != calendar or row.get('user_id') != owner or
                    row.get('name') != 'Knippen' or row.get('is_active') is not True or
                    type(row.get('duration')) is not int or row['duration'] != 30 or
                    isinstance(row.get('price'), bool) or Decimal(str(row.get('price'))) != Decimal('40.00')):
                    raise ValueError('S19 service readback mismatch')
        except (KeyError, InvalidOperation):
            raise ValueError('S19 service readback mismatch') from None
        bid = str(core.uuid.uuid4())
        start = core.ts(date, time_)
        end = core.ts(date, core.add_minutes(time_, 30))
        q = core.q
        core.mgmt_sql(
            'insert into public.bookings (id, calendar_id, service_type_id, customer_name, '
            'customer_phone, start_time, end_time, status, internal_notes, service_name, '
            'booking_duration, total_price, customer_locale) values '
            f"({q(bid)}::uuid, {q(cal)}::uuid, {q(svc)}::uuid, {q(name)}, {q(phone)}, "
            f"{q(start)}::timestamptz, {q(end)}::timestamptz, 'confirmed', "
            f"{q(core.RUN_MARKER + ' prep S19')}, 'Knippen', 30, 40.00, 'nl')"
        )
        return {'bookings': [{'id': bid, 'calendar_id': cal, 'start_time': start,
                              'customer_name': name, 'service_type_id': svc,
                              'service_name': 'Knippen', 'booking_duration': 30}]}

    core.prep_scenario = prepare
