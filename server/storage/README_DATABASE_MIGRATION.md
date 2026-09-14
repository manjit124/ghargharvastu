# VastuVision AI - Production Database Migration Strategy (Cloud Run & Firestore/Cloud SQL)

## 1. Inventory of Current Persistent Data Structures
The following datasets are currently managed by `AdminDataStore`:
1. **User Accounts & Entitlements** (`userAccounts`): `userId`, `plan`, `freeChatMinutesRemaining`, `freePhotosRemaining`, `creditsBalance`, `todayUsage`.
2. **Authoritative Credit Ledger** (`creditLedger`): Every credit debit/credit transaction with `id`, `transactionId`, `type`, `amount`, `balanceBefore`, `balanceAfter`, `reason`.
3. **Subscriptions & Orders** (`subscriptions`): Active and historical subscriptions, billing dates, payment statuses.
4. **App Registered Users** (`users`): Password hashes, email, registration date, usage metrics.
5. **AI Usage & Cost Protection State** (`globalAiSafety`): Real-time token consumption, request counts, emergency lock state.
6. **Security Audit & Abuse Logs** (`securityEvents`, `auditLogs`): Rate-limiting incidents, unauthorized API rejections, IP anomalies.
7. **IP Guest Fingerprints** (`ipHashUserMap`): Prevents incognito and localStorage wiping from refreshing the 5 free minutes/photos allowance.
8. **Vastu Knowledge & System Prompt Versions** (`knowledge`, `promptHistory`, `popularQuestions`).

## 2. Cloud Architecture Migration Path
In production on Google Cloud Run (where multiple stateless instances scale up and down):

### Option A: Google Cloud Firestore (Recommended for NoSQL & Realtime)
- **Collections**:
  - `/users/{userId}` - maps to `UserCreditAccount` & `AppUserRecord`.
  - `/credit_ledger/{txId}` - append-only immutable ledger.
  - `/subscriptions/{subId}` - subscription states.
  - `/security_events/{eventId}` - audit trails.
  - `/system_config/global_ai_safety` - atomic distributed document with Firestore transactions.
- **Transactions & Concurrency**:
  - Use `firestore.runTransaction()` to atomically check credits, reserve credits, and deduct in a single atomic database operation across multiple Cloud Run instances.
  - Firestore document locking guarantees double-spending prevention natively across all container instances.

### Option B: Google Cloud SQL (PostgreSQL)
- Relational schema with Drizzle/Prisma.
- `SELECT ... FOR UPDATE` row-level locks for credit deductions.
- Native foreign keys between users, subscriptions, and ledger entries.

## 3. Backward-Compatible Zero-Downtime Migration
- `AdminDataStore` uses the `IAdminStorageProvider` abstraction.
- Setting `STORAGE_DRIVER=firestore` switches to the Cloud Firestore adapter without requiring changes to business logic or route middleware.
- An export/seed CLI tool reads the current `admin_store.json` snapshot and seeds collections automatically during initial deployment.
