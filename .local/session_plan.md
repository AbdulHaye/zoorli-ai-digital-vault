# Objective
Fix the signup, email verification, and authentication flows so that:
1. After signup, user sees a clear "verify your email" message and is redirected to the sign-in page (not homepage)
2. Login blocks unverified users with a clear message to check their email
3. Forgot password flow is audited for proper messaging
4. Email verification link landing page works correctly

## Current Issues Found
- **Signup flow**: `SignUpForm.tsx` already shows an "email sent" card after signup, but the user reports being sent back to homepage without a message. The backend creates an auth session token on signup (unnecessary since we want email verification first). Need to verify the email sent screen actually persists and add a timed redirect to sign-in.
- **Login flow**: `POST /api/auth/signin` does NOT check `isEmailVerified` — unverified users can log in freely, which undermines the entire verification system.
- **Backend signup**: Returns an auth token on signup — this shouldn't happen since the user needs to verify first.
- **Forgot password flow**: Already well-implemented with proper dialogs, toasts, and error handling. Needs minor audit.

---

# Tasks

### T001: Fix backend signup to not return auth token
- **Blocked By**: []
- **Details**:
  - In `server/routes.ts`, `POST /api/auth/signup` handler: remove the `createAuthSession` call and do not return a `token` in the response
  - The response should still return `success: true` with the user data (minus password) and a clear message like "Account created. Please check your email to verify your account."
  - The verification email is already sent — keep that logic
  - Files: `server/routes.ts`
  - Acceptance: Signup response has no token; user cannot auto-login after registration

### T002: Add email verification check to signin endpoint
- **Blocked By**: []
- **Details**:
  - In `server/routes.ts`, `POST /api/auth/signin` handler: after password verification succeeds, check if `user.isEmailVerified` is `true`
  - If not verified, return a 403 response with a clear message: "Please verify your email address before signing in. Check your inbox for the verification link."
  - Admin users (role === 'admin') should bypass this check since they may have been created manually
  - Files: `server/routes.ts`
  - Acceptance: Unverified users cannot sign in; they get a clear message to verify their email

### T003: Fix signup form to show success message and redirect to sign-in
- **Blocked By**: []
- **Details**:
  - In `client/src/components/auth/SignUpForm.tsx`: the `emailSent` state already triggers a verification card view — keep this
  - Add a 5-second auto-redirect: after showing the "email sent" message for 5 seconds, automatically switch to the sign-in view by calling `onSwitchToSignIn()`
  - Add a countdown indicator so the user knows they'll be redirected (e.g., "Redirecting to sign in in 5s...")
  - Make sure the toast message is clear and visible
  - Files: `client/src/components/auth/SignUpForm.tsx`
  - Acceptance: After signup, user sees "check your email" message for 5 seconds, then is taken to the sign-in form

### T004: Handle unverified user error on the sign-in form
- **Blocked By**: [T002]
- **Details**:
  - In `client/src/components/auth/SignInForm.tsx`: when the signin API returns a 403 with the email verification error, show a specific message/alert (not just a generic error toast)
  - Display an informative message: "Your email is not verified. Please check your inbox for the verification link."
  - Optionally add a "Resend verification email" button that calls a new endpoint
  - Files: `client/src/components/auth/SignInForm.tsx`
  - Acceptance: Unverified users see a clear, helpful message on the sign-in form explaining what to do

### T005: Add resend verification email endpoint
- **Blocked By**: []
- **Details**:
  - In `server/routes.ts`, add `POST /api/auth/resend-verification` endpoint
  - Accepts `{ email }` in the body
  - Finds the user by email, checks if already verified (if so, return message saying already verified)
  - Generates a new verification token and expiry, updates the user record, and sends a new verification email
  - Rate-limit this endpoint (max 3 per 15 minutes) to prevent abuse
  - Files: `server/routes.ts`
  - Acceptance: Users can request a new verification email if their original one expired or was lost

### T006: Audit forgot password flow
- **Blocked By**: []
- **Details**:
  - Review the forgot password flow end-to-end (already implemented with dialogs and toasts)
  - Verify the OTP email is actually sent successfully
  - Verify error messages are user-friendly
  - Verify the password reset success redirects properly back to the sign-in form
  - Fix any issues found
  - Files: `client/src/components/auth/SignInForm.tsx`, `server/routes.ts`
  - Acceptance: Forgot password flow works end-to-end with clear messaging at every step

### T007: Test and verify all auth flows
- **Blocked By**: [T001, T002, T003, T004, T005, T006]
- **Details**:
  - Restart server and verify clean startup
  - Verify signup: user sees "check your email" message, gets redirected to sign-in after 5 seconds
  - Verify login: unverified user gets blocked with verification message; verified user can log in
  - Verify email verification link works and logs user in
  - Verify forgot password flow works end-to-end
  - Verify resend verification email works
  - Update `replit.md` to document the updated auth flows
  - Files: all modified files, `replit.md`
  - Acceptance: All auth flows work correctly with proper user messaging
