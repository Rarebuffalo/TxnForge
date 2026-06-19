-- Enable Row-Level Security on the Transaction table
ALTER TABLE transaction ENABLE ROW LEVEL SECURITY;

-- Drop the policy if it already exists to avoid migration conflicts
DROP POLICY IF EXISTS tenant_isolation_policy ON transaction;

-- Create the row-level security policy
-- It checks that the organization_id of the transaction matches the active organization
-- set in the 'app.current_org_id' local database context parameter.
CREATE POLICY tenant_isolation_policy ON transaction
  USING (organization_id = current_setting('app.current_org_id', true));
