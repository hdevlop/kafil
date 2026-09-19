# Najm Query DX completion evidence

Date: **2026-09-19**

The Najm Query DX implementation plan was retired from the repository root after
all of its owned phases were completed. This record preserves the completion
boundary and the evidence that justified removing it from the active-plan list.

## Delivered contract

- `najm-kit/query/keys` provides server-safe `entityKeys` and
  `createEntityKeys` helpers.
- `najm-kit/query` provides the shared `useEntityQuery` and
  `useEntityCommand` hooks while retaining the responsive list exports.
- `najm-kit/query/crud` provides School's optional-i18n `useEntityCRUD`
  compatibility bridge.
- Command invalidation is awaited, TanStack mutation callbacks and context are
  preserved, application error resolvers retain precedence, and common API
  error shapes use Najm Kit feedback.

## Adoption audit

| Boundary | Evidence |
| --- | --- |
| Najm Kit source | Query keys, read/command hooks, CRUD bridge, focused tests, package exports, declarations, and release commits are present in `C:\Users\hdevlop\Desktop\najm`. |
| Registry | The query layer was released in `najm-kit@2.16.2`. At Query adoption, Kafil and School resolved the later compatible `2.16.4`; Kafil subsequently moved to `2.16.6` for a separate phone-input fix. |
| Kafil | Feature hooks import `najm-kit/query` and `najm-kit/query/keys`; the former local `queryKeys.ts`, `useEntityQuery.ts`, and `useEntityCommand.ts` files are absent. Kafil keeps its application-owned catalog and cross-feature invalidation policy. |
| School | Feature hooks import `najm-kit/query/crud`; the former local `useEntityCRUD.tsx` and `useDelayedLoading.ts` files are absent. School keeps endpoint, translation, response-shaping, and feature-specific invalidation policy. |

## Recorded validation

The implementation run recorded these results against the completed source:

- Najm Kit: lint passed; 1,333 package tests and 9 RSC tests passed; build,
  distribution-shape, import-isolation, and public-API checks passed.
- Kafil: lint and typecheck passed; 462 web, 505 server, and 90 seed tests
  passed; production build passed; `db:generate` reported no schema changes.
- School: lint passed with three pre-existing `no-img-element` warnings; 77
  dashboard tests and locale parity passed; production build passed.
- The published `najm-kit@2.16.2` artifact resolved with registry integrity
  `sha512-OZ+qQgHBs37mlD5eS5TS/GMQKLoxJBftYxhvuNp7Aq0s7rXmRvBdnXp+/QZdq66mbWqhgv3KZqe30+12xsFKNw==`.

Two adoption defects were fixed before the completed release was accepted: an
application `errorMessage` resolver had incorrectly been treated as a fallback,
and the CRUD bridge's response payload default was too narrow for School's
endpoint-map consumers. Both behaviors are covered by package tests.

## Separate boundaries

- The Query DX slice is non-visual; browser, responsive, and RTL acceptance was
  outside its scope and was not claimed.
- Deployment and production acceptance were outside its scope and were not
  attempted for this slice.
- At retirement time, Najm's Query commits were local and School's adoption was
  still an uncommitted working-tree change. Git publication is therefore not
  promoted to a completed outcome by this record.

The complete retired [Query DX plan](PLAN.md) is archived beside this record;
its original root copy also remains in Git history at Kafil commit `9593f67`.
