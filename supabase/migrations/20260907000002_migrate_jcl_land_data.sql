-- ============================================================================
-- Migration: Copy-Only Migration for JCL Land Records into univ_land_*
-- Strict isolation: Filters by specific JCL company_id AND property_type IN ('land', 'parcel')
-- Non-destructive: Copies into univ_land_*, preserving original univ_re_properties records
-- ============================================================================

DO $$
DECLARE
    r RECORD;
    jcl_company_id UUID;
    features_json JSONB;
    owner_item JSONB;
    alloc_item JSONB;
BEGIN
    -- Target strictly JCL Royal Group company IDs to prevent touching any other tenant's land assets
    FOR jcl_company_id IN 
        SELECT id FROM public.companies 
        WHERE industry_type = 'real_estate_jcl' 
           OR name ILIKE '%JCL%' 
           OR custom_domain ILIKE '%jcl%'
    LOOP
        -- Process only land records owned by this specific company
        FOR r IN 
            SELECT * FROM public.univ_re_properties 
            WHERE company_id::text = jcl_company_id::text 
              AND property_type IN ('land', 'parcel')
        LOOP
            -- Parse features JSON safely
            BEGIN
                features_json := r.features::jsonb;
            EXCEPTION WHEN OTHERS THEN
                features_json := '{}'::jsonb;
            END;

            -- 1. Copy into univ_land_parcels
            INSERT INTO public.univ_land_parcels (
                id,
                created_at,
                updated_at,
                company_id,
                parcel_name,
                plot_number,
                cadastral_ref,
                address,
                city,
                state,
                country,
                zip_code,
                lot_size_acres,
                square_feet,
                zoning,
                topography,
                title_type,
                price,
                status,
                description,
                agent_name,
                documents
            ) VALUES (
                r.id,
                r.created_at,
                r.created_at,
                r.company_id::uuid,
                COALESCE(features_json->>'parcelName', r.address, 'Land Parcel'),
                COALESCE(features_json->>'plotNumber', ''),
                COALESCE(features_json->>'cadastralRef', ''),
                r.address,
                r.city,
                r.state,
                COALESCE(r.country, 'Ghana'),
                r.zip_code,
                COALESCE(NULLIF(features_json->>'lotSizeAcres', '')::numeric, r.lot_size, 0),
                COALESCE(r.square_feet, 0),
                COALESCE(features_json->>'zoning', 'residential'),
                COALESCE(features_json->>'topography', 'flat'),
                COALESCE(features_json->>'titleType', 'C_of_O'),
                COALESCE(r.price, 0),
                COALESCE(r.status, 'available'),
                r.description,
                r.agent_name,
                COALESCE(features_json->'documents', '[]'::jsonb)
            )
            ON CONFLICT (id) DO NOTHING;

            -- 2. Copy ownership records if present in features JSON
            IF features_json ? 'ownershipInterests' AND jsonb_typeof(features_json->'ownershipInterests') = 'array' THEN
                FOR owner_item IN SELECT * FROM jsonb_array_elements(features_json->'ownershipInterests')
                LOOP
                    INSERT INTO public.univ_land_ownership (
                        company_id,
                        parcel_id,
                        owner_name,
                        percentage,
                        interest_type,
                        deed_ref,
                        phone,
                        email
                    ) VALUES (
                        r.company_id::uuid,
                        r.id,
                        COALESCE(owner_item->>'ownerName', 'Owner'),
                        COALESCE(NULLIF(owner_item->>'percentage', '')::numeric, 100),
                        COALESCE(owner_item->>'interestType', 'Freehold'),
                        owner_item->>'deedRef',
                        owner_item->>'phone',
                        owner_item->>'email'
                    );
                END LOOP;
            END IF;

            -- 3. Copy allocation records if present in features JSON
            IF features_json ? 'allocation' AND jsonb_typeof(features_json->'allocation') = 'object' AND features_json->'allocation' != 'null'::jsonb THEN
                alloc_item := features_json->'allocation';
                INSERT INTO public.univ_land_allocations (
                    company_id,
                    parcel_id,
                    customer_name,
                    customer_email,
                    customer_phone,
                    allocation_date,
                    expiry_date,
                    deposit_amount,
                    total_agreed_price,
                    payment_terms,
                    allocation_status,
                    notes
                ) VALUES (
                    r.company_id::uuid,
                    r.id,
                    COALESCE(alloc_item->>'customerName', 'Client Allocation'),
                    alloc_item->>'customerEmail',
                    alloc_item->>'customerPhone',
                    COALESCE(NULLIF(alloc_item->>'allocationDate', '')::date, CURRENT_DATE),
                    NULLIF(alloc_item->>'expiryDate', '')::date,
                    COALESCE(NULLIF(alloc_item->>'depositAmount', '')::numeric, 0),
                    COALESCE(NULLIF(alloc_item->>'totalAgreedPrice', '')::numeric, r.price, 0),
                    COALESCE(alloc_item->>'paymentTerms', 'outright'),
                    COALESCE(alloc_item->>'allocationStatus', 'active_reserved'),
                    alloc_item->>'notes'
                );
            END IF;

        END LOOP;
    END LOOP;
END $$;
