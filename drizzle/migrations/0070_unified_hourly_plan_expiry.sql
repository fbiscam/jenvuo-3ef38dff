DO $migration$
DECLARE d text;
BEGIN
  SELECT pg_get_functiondef('public.process_founding_renewals()'::regprocedure) INTO d;
  IF position('PERFORM public.process_paid_plan_expiry();' IN d) = 0 THEN
    EXECUTE replace(d, E'BEGIN\n', E'BEGIN\n  PERFORM public.process_paid_plan_expiry();\n');
  END IF;
  SELECT pg_get_functiondef('public.process_free_monthly_credit()'::regprocedure) INTO d;
  IF position('PERFORM public.process_paid_plan_expiry();' IN d) = 0 THEN
    EXECUTE replace(d, '  FOR _u IN', E'  PERFORM public.process_paid_plan_expiry();\n  FOR _u IN');
  END IF;
END
$migration$;