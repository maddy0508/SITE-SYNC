-- M1.4 device lifecycle hardening
--
-- The M1.4 RLS boundary intentionally scopes device rows to the authenticated
-- user. This migration adds the missing database invariants so a client cannot
-- bypass the DeviceRegistrationService lifecycle by writing directly to the
-- table.

-- There may be at most one active installation for a user. Do not silently
-- discard data if an existing database violates the invariant.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.device_installations
        WHERE status = 'ACTIVE'
        GROUP BY user_id
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION
            'device_installations contains multiple ACTIVE installations for at least one user; reconcile before applying M1.4 lifecycle hardening';
    END IF;
END;
$$;

CREATE UNIQUE INDEX device_installations_one_active_per_user
ON public.device_installations (user_id)
WHERE status = 'ACTIVE';

CREATE OR REPLACE FUNCTION public.enforce_device_installation_lifecycle()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.status <> 'ACTIVE' THEN
            RAISE EXCEPTION 'new device installations must start ACTIVE';
        END IF;
        IF NEW.revoked_at IS NOT NULL THEN
            RAISE EXCEPTION 'new ACTIVE device installations cannot have revoked_at';
        END IF;
        RETURN NEW;
    END IF;

    -- Identity and creation time are immutable after registration. This
    -- prevents a client from rebinding an installation to another user/key.
    IF NEW.user_id <> OLD.user_id THEN
        RAISE EXCEPTION 'device installation user_id is immutable';
    END IF;
    IF NEW.installation_key <> OLD.installation_key THEN
        RAISE EXCEPTION 'device installation installation_key is immutable';
    END IF;
    IF NEW.created_at <> OLD.created_at THEN
        RAISE EXCEPTION 'device installation created_at is immutable';
    END IF;

    -- Revocation is terminal. A revoked audit record cannot be reactivated or
    -- otherwise modified through the client-facing table policy.
    IF OLD.status = 'REVOKED' THEN
        RAISE EXCEPTION 'revoked device installations are immutable';
    END IF;

    IF NEW.status = 'ACTIVE' AND NEW.revoked_at IS NOT NULL THEN
        RAISE EXCEPTION 'ACTIVE device installations cannot have revoked_at';
    END IF;

    IF NEW.status = 'REVOKED' AND NEW.revoked_at IS NULL THEN
        RAISE EXCEPTION 'REVOKED device installations require revoked_at';
    END IF;

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_device_installation_lifecycle() FROM PUBLIC;

DROP TRIGGER IF EXISTS device_installations_enforce_lifecycle
ON public.device_installations;

CREATE TRIGGER device_installations_enforce_lifecycle
BEFORE INSERT OR UPDATE
ON public.device_installations
FOR EACH ROW
EXECUTE FUNCTION public.enforce_device_installation_lifecycle();
