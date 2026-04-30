// ─── Trusted contact types ────────────────────────────────────────────────────
// Slice 10 – CRUD management (add / edit / delete / set primary)
// Slice 11 – alert simulation (contacts receive SMS + push preview)

/** A person who receives safety alerts on behalf of the user. */
export interface TrustedContact {
  /** UUID generated at creation time. */
  id: string;
  name: string;
  phone: string;
  email: string;
  /** Only one contact may hold primary status at a time. */
  isPrimary: boolean;
}