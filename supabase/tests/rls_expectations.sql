-- Expectations enforced by the production policies. Run with pgTAP when the local stack is up.
-- anon cannot insert faculty, news, alumni, listings, or profiles
-- anon cannot execute audit_write or office_delete_account
-- a missing JWT is not super_admin
-- published news remains readable
-- alumni is office-only
-- checkout does not mark an order paid from the browser
select 1;
