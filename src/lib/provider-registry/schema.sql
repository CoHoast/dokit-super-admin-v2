-- Provider Email Registry Schema
-- Stores verified provider billing emails for negotiation

-- Main provider registry table
CREATE TABLE IF NOT EXISTS provider_email_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Provider identification
  npi VARCHAR(10) NOT NULL,
  tax_id VARCHAR(20),
  provider_name VARCHAR(255) NOT NULL,
  provider_type VARCHAR(50), -- individual, organization
  specialty VARCHAR(100),
  
  -- Primary verified email
  verified_email VARCHAR(255),
  verified_at TIMESTAMPTZ,
  verification_method VARCHAR(50), -- response_verified, manual, solidarity_import, portal_click
  
  -- Email confidence
  confidence INTEGER DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 100),
  
  -- Contact details
  billing_phone VARCHAR(20),
  billing_fax VARCHAR(20),
  billing_address TEXT,
  
  -- Alternative emails (tried but not verified, or secondary contacts)
  alternative_emails JSONB DEFAULT '[]',
  
  -- Tracking
  total_offers_sent INTEGER DEFAULT 0,
  total_responses INTEGER DEFAULT 0,
  last_offer_sent TIMESTAMPTZ,
  last_response TIMESTAMPTZ,
  response_rate DECIMAL(5,2) DEFAULT 0,
  
  -- Status
  status VARCHAR(20) DEFAULT 'unverified' CHECK (status IN ('unverified', 'verified', 'invalid', 'review_needed')),
  
  -- Source tracking
  source VARCHAR(50) DEFAULT 'extraction', -- extraction, solidarity_import, manual, nppes
  source_bill_id UUID, -- First bill that created this record
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(100),
  updated_by VARCHAR(100),
  notes TEXT,
  
  -- Constraints
  CONSTRAINT unique_npi UNIQUE (npi)
);

-- Email history table (track all emails tried for a provider)
CREATE TABLE IF NOT EXISTS provider_email_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES provider_email_registry(id) ON DELETE CASCADE,
  npi VARCHAR(10) NOT NULL,
  
  email VARCHAR(255) NOT NULL,
  source VARCHAR(50) NOT NULL, -- extraction, import, manual
  
  -- Validation
  mx_valid BOOLEAN,
  mx_checked_at TIMESTAMPTZ,
  
  -- Usage tracking
  times_used INTEGER DEFAULT 0,
  times_bounced INTEGER DEFAULT 0,
  times_responded INTEGER DEFAULT 0,
  
  -- Outcome
  status VARCHAR(20) DEFAULT 'untested' CHECK (status IN ('untested', 'working', 'bounced', 'no_response', 'invalid')),
  last_used TIMESTAMPTZ,
  last_outcome VARCHAR(50),
  last_outcome_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  extracted_from_bill_id UUID,
  
  CONSTRAINT unique_provider_email UNIQUE (npi, email)
);

-- Verification events (audit trail)
CREATE TABLE IF NOT EXISTS provider_email_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES provider_email_registry(id) ON DELETE CASCADE,
  npi VARCHAR(10) NOT NULL,
  email VARCHAR(255) NOT NULL,
  
  -- Verification details
  verification_type VARCHAR(50) NOT NULL, -- portal_click, offer_accepted, offer_countered, email_reply, manual
  verification_source VARCHAR(100), -- bill_id, offer_id, etc.
  
  -- Request details
  ip_address INET,
  user_agent TEXT,
  
  -- Metadata
  verified_at TIMESTAMPTZ DEFAULT NOW(),
  verified_by VARCHAR(100) -- system, user email, etc.
);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_provider_registry_npi ON provider_email_registry(npi);
CREATE INDEX IF NOT EXISTS idx_provider_registry_email ON provider_email_registry(verified_email);
CREATE INDEX IF NOT EXISTS idx_provider_registry_status ON provider_email_registry(status);
CREATE INDEX IF NOT EXISTS idx_provider_registry_name ON provider_email_registry(provider_name);

CREATE INDEX IF NOT EXISTS idx_email_history_npi ON provider_email_history(npi);
CREATE INDEX IF NOT EXISTS idx_email_history_email ON provider_email_history(email);
CREATE INDEX IF NOT EXISTS idx_email_history_status ON provider_email_history(status);

CREATE INDEX IF NOT EXISTS idx_verifications_npi ON provider_email_verifications(npi);
CREATE INDEX IF NOT EXISTS idx_verifications_email ON provider_email_verifications(email);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_provider_registry_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-updating timestamp
DROP TRIGGER IF EXISTS provider_registry_timestamp ON provider_email_registry;
CREATE TRIGGER provider_registry_timestamp
  BEFORE UPDATE ON provider_email_registry
  FOR EACH ROW
  EXECUTE FUNCTION update_provider_registry_timestamp();

-- View for quick provider lookup with stats
CREATE OR REPLACE VIEW provider_email_summary AS
SELECT 
  r.id,
  r.npi,
  r.provider_name,
  r.verified_email,
  r.status,
  r.confidence,
  r.verification_method,
  r.verified_at,
  r.total_offers_sent,
  r.total_responses,
  r.response_rate,
  r.last_response,
  (SELECT COUNT(*) FROM provider_email_history h WHERE h.npi = r.npi) as total_emails_tried,
  (SELECT COUNT(*) FROM provider_email_history h WHERE h.npi = r.npi AND h.status = 'working') as working_emails,
  r.created_at,
  r.updated_at
FROM provider_email_registry r;
