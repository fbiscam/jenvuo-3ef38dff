-- The "own profile update" policy calls current_profile_plan(); signed-in users
-- need EXECUTE for profile updates (photo, name) to work. The function only
-- returns the caller's own plan, so this exposes nothing extra.
GRANT EXECUTE ON FUNCTION public.current_profile_plan(uuid) TO authenticated;