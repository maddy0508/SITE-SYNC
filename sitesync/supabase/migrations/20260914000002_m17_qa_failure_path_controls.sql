-- M1.7 PHYSICAL QA ONLY. Never promote to production.
CREATE OR REPLACE FUNCTION public.m17_qa_revoke_current_device(p_device_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_email TEXT;
    v_status TEXT;
BEGIN
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
    SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;
    IF v_email IS NULL OR LOWER(v_email) NOT LIKE 'm17-qa-%@sitesync.app' THEN
        RAISE EXCEPTION 'M17_QA_REQUIRES_SITESYNC_QA_EMAIL';
    END IF;
    UPDATE public.device_installations
    SET status = 'REVOKED', revoked_at = COALESCE(revoked_at, now()), last_seen_at = now()
    WHERE id = p_device_id AND user_id = v_user_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'QA_DEVICE_NOT_FOUND'; END IF;
    SELECT status INTO v_status FROM public.device_installations WHERE id = p_device_id;
    RETURN jsonb_build_object('device_installation_id', p_device_id, 'status', v_status);
END;
$$;
REVOKE ALL ON FUNCTION public.m17_qa_revoke_current_device(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.m17_qa_revoke_current_device(UUID) TO authenticated;
