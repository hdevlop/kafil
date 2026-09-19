DO $$
DECLARE
	duplicate_summary text;
BEGIN
	SELECT string_agg(
		format('%s (%s)', duplicate_name, duplicate_count),
		', ' ORDER BY duplicate_name
	)
	INTO duplicate_summary
	FROM (
		SELECT "name" AS duplicate_name, count(*) AS duplicate_count
		FROM "roles"
		GROUP BY "name"
		HAVING count(*) > 1
	) AS duplicate_roles;

	IF duplicate_summary IS NOT NULL THEN
		RAISE EXCEPTION USING
			MESSAGE = 'Cannot create roles_name_unique; duplicate role names: ' || duplicate_summary,
			ERRCODE = '23505';
	END IF;
END
$$;
--> statement-breakpoint
CREATE UNIQUE INDEX "roles_name_unique" ON "roles" USING btree ("name");
