
-- Fix service-calendar linkages: connect each service to its correct calendar
-- knipbeurt sarah → Sarah's calendar
UPDATE service_types 
SET calendar_id = 'af6c29e2-f7b6-4fbf-83f0-ea738c30d5ef'
WHERE id = '6fd7a06f-fd06-48d2-8313-8ebe50163595';

-- knipbeurt Jan → Jan's calendar
UPDATE service_types 
SET calendar_id = 'a3d6634a-f755-462f-8637-f575c69b3669'
WHERE id = '72ef264f-8618-4b15-9b5f-995086ffed40';

-- knipbeurt tim → Tim's calendar
UPDATE service_types 
SET calendar_id = '7e664bf2-c638-4a40-81f1-a08801d5992b'
WHERE id = '88ee9eb7-ce7b-4047-a3dd-cf76bc8515ff';

-- massage → Massage calendar
UPDATE service_types 
SET calendar_id = '008a9597-da59-46aa-beba-40902a9c745a'
WHERE id = '21066345-c054-44f3-9943-108fc24ff730';
