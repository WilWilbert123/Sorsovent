# Mingle Application Security Checklist

| Finding ID | Severity | Category | Description | Status | Verification & Implementation Reference |
|---|---|---|---|---|---|
| **SEC-001** | CRITICAL | XSS | Stored XSS in interactive Leaflet map markers and popups | **PASS** | `lib/security/sanitize.ts`, `components/map/map-view-inner.tsx`, `components/map/location-picker-inner.tsx` |
| **SEC-002** | CRITICAL | Broken Access Control | Push notification spoofing, SW open redirect & actor_id manipulation | **PASS** | `app/api/notifications/send-push/route.ts`, `app/api/notifications/route.ts`, `public/firebase-messaging-sw.js`, `scripts/supabase/migrations/044_security_hardening.sql` |
| **SEC-003** | CRITICAL | Supply Chain | Next.js image optimization & App Router Server Action advisories | **PASS** | `package.json`, `npm audit fix` |
| **SEC-004** | HIGH | Privilege Escalation | User self-unban via profile `privacy_settings` update | **PASS** | `scripts/supabase/migrations/044_security_hardening.sql`, `app/actions/conversations.ts`, `app/api/events/route.ts`, `app/api/admin/actions/route.ts` |
| **SEC-005** | HIGH | Open Redirect | Unvalidated redirect parameters in OAuth callbacks | **PASS** | `app/(auth)/auth/callback/route.ts`, `app/actions/auth.ts`, `lib/security/sanitize.ts` |
| **SEC-006** | HIGH | Broken Access Control | Public unauthorized read/write access to event chat rooms | **PASS** | `scripts/supabase/migrations/044_security_hardening.sql` (RLS policies on `public.event_messages`) |
| **SEC-007** | HIGH | Insecure Uploads | Insecure Cloudinary signatures, unverified webhooks & unverified media deletion | **PASS** | `app/api/cloudinary/signature/route.ts`, `app/api/cloudinary/webhook/route.ts`, `app/api/uploads/delete/route.ts` |
| **SEC-008** | HIGH | DoS / Brute-Force | Missing rate limiting on sensitive API endpoints | **PASS** | `lib/security/rate-limit.ts` (sliding window rate limiter applied to comments, posts, events, reports, push alerts, auth) |
| **SEC-009** | HIGH | Supply Chain | Prototype pollution & DoS in transitive CLI packages (`shadcn`, `deepmerge`, `zod`) | **PASS** | `package.json` (pruned CLI from runtime), `npm audit fix` |
| **SEC-010** | MEDIUM | Info Exposure | Unauthenticated health check endpoint exposing DB error details | **PASS** | `app/admin/api/health/route.ts`, `proxy.ts` |
| **SEC-011** | MEDIUM | XSS | JavaScript pseudo-protocol execution in profile social links | **PASS** | `components/settings/profile-settings-form.tsx`, `scripts/supabase/migrations/044_security_hardening.sql` |
| **SEC-012** | MEDIUM | IDOR | Event deletion & modification authorization verification | **PASS** | `app/api/events/[eventId]/route.ts` |
| **SEC-013** | MEDIUM | Defense-in-Depth | Missing HTTP security headers (CSP, HSTS, X-Frame-Options, Sniff, Referrer) | **PASS** | `next.config.ts` |
| **SEC-014** | MEDIUM | CSRF | Forced logout via GET requests on `/api/auth/signout` | **PASS** | `app/api/auth/signout/route.ts` (POST only; GET returns 405) |
| **SEC-015** | MEDIUM | Input Validation | Missing schema validation & payload length boundaries on API routes | **PASS** | `app/api/posts/route.ts`, `app/api/events/route.ts`, `app/api/reports/route.ts`, `app/api/posts/[id]/comments/route.ts` |
| **SEC-016** | MEDIUM | Broken Access Control | Inconsistent admin authorization checks across edge proxy and API routes | **PASS** | `lib/admin/auth.ts`, `proxy.ts`, `app/admin/layout.tsx`, `app/api/admin/users/route.ts` |
| **SEC-017** | LOW | Authentication | Password change without current password re-authentication | **PASS** | `components/settings/security-settings-form.tsx` |
| **SEC-018** | LOW | Sensitive Data Exposure | Raw JWT session tokens leaked in `/api/auth/session` | **PASS** | `app/api/auth/session/route.ts` |
| **SEC-019** | LOW | Business Logic | Ephemeral in-memory system settings lost on serverless cold starts | **PASS** | `scripts/supabase/migrations/044_security_hardening.sql` (`public.system_settings` table) |
| **SEC-020** | LOW | Privilege Escalation | Unset search_path on PostgreSQL SECURITY DEFINER functions | **PASS** | `scripts/supabase/migrations/044_security_hardening.sql` (`SET search_path = public, pg_temp;`) |
| **SEC-021** | INFO | Hardcoded Configuration | Hardcoded super admin email in multiple source files | **PASS** | `lib/admin/auth.ts` (`DEFAULT_SUPER_ADMIN_EMAIL`) |

