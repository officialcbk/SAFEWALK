// ─── Trusted contacts management page ────────────────────────────────────────
// Slice 10 – add / edit / delete up to 5 contacts; persisted to Supabase

import { useCallback, useEffect, useState } from "react";
import type { TrustedContact } from "../types/contact";
import {
  loadContactsDB,
  insertContactDB,
  updateContactDB,
  deleteContactDB,
  setPrimaryContactDB,
} from "../services/db";
import "../styles/ContactsPage.css";

const MAX_CONTACTS = 5;

function isValidPhone(phone: string): boolean {
  return /^\+?[\d\s\-(). ]{7,15}$/.test(phone.trim());
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

interface FormState {
  name: string;
  phone: string;
  email: string;
}

const EMPTY_FORM: FormState = { name: "", phone: "", email: "" };

function ContactsPage() {
  const [contacts, setContacts] = useState<TrustedContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<FormState>>({});

  useEffect(() => {
    loadContactsDB().then((data) => {
      setContacts(data);
      setLoading(false);
    });
  }, []);

  const validate = useCallback((f: FormState): Partial<FormState> => {
    const errs: Partial<FormState> = {};
    if (!f.name.trim()) errs.name = "Name is required.";
    if (!isValidPhone(f.phone)) errs.phone = "Enter a valid phone number.";
    if (!isValidEmail(f.email)) errs.email = "Enter a valid email address.";
    return errs;
  }, []);

  const handleSubmit = useCallback(async () => {
    const errs = validate(form);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setSaving(true);

    if (editingId) {
      const updated = contacts.find((c) => c.id === editingId);
      if (updated) {
        const patched = { ...updated, ...form };
        await updateContactDB(patched);
        setContacts((prev) => prev.map((c) => (c.id === editingId ? patched : c)));
      }
      setEditingId(null);
    } else {
      const isFirst = contacts.length === 0;
      const created = await insertContactDB({ ...form, isPrimary: isFirst });
      if (created) setContacts((prev) => [...prev, created]);
    }

    setForm(EMPTY_FORM);
    setSaving(false);
  }, [form, editingId, contacts, validate]);

  const handleEdit = useCallback((c: TrustedContact) => {
    setForm({ name: c.name, phone: c.phone, email: c.email });
    setEditingId(c.id);
    setErrors({});
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    await deleteContactDB(id);
    setContacts((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      // Promote first remaining to primary if primary was deleted
      if (updated.length > 0 && !updated.some((c) => c.isPrimary)) {
        updated[0] = { ...updated[0], isPrimary: true };
        updateContactDB(updated[0]);
      }
      return updated;
    });
    if (editingId === id) { setEditingId(null); setForm(EMPTY_FORM); }
  }, [editingId]);

  const handleSetPrimary = useCallback(async (id: string) => {
    await setPrimaryContactDB(id);
    setContacts((prev) => prev.map((c) => ({ ...c, isPrimary: c.id === id })));
  }, []);

  const handleCancel = useCallback(() => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setErrors({});
  }, []);

  const atLimit = contacts.length >= MAX_CONTACTS && !editingId;

  if (loading) {
    return (
      <div className="sw-contacts-layout">
        <section className="sw-contacts-card">
          <p className="sw-contacts-empty">Loading contacts…</p>
        </section>
      </div>
    );
  }

  return (
    <div className="sw-contacts-layout">
      <section className="sw-contacts-card">
        <div className="sw-contacts-header">
          <div>
            <p className="sw-walk-eyebrow">Safety network</p>
            <h1 className="sw-contacts-title">Trusted Contacts</h1>
            <p className="sw-contacts-description">
              Add up to {MAX_CONTACTS} people who'll receive alerts if you need help.
            </p>
          </div>
          <span
            className="sw-contacts-count"
            aria-label={`${contacts.length} of ${MAX_CONTACTS} contacts added`}
          >
            {contacts.length}/{MAX_CONTACTS}
          </span>
        </div>

        {contacts.length > 0 ? (
          <ul className="sw-contacts-list" aria-label="Your trusted contacts">
            {contacts.map((c) => (
              <li key={c.id} className="sw-contact-item">
                <div className="sw-contact-info">
                  <div className="sw-contact-name-row">
                    <span className="sw-contact-name">{c.name}</span>
                    {c.isPrimary && (
                      <span className="sw-contact-primary-badge" aria-label="Primary contact">
                        Primary
                      </span>
                    )}
                  </div>
                  <span className="sw-contact-detail">{c.phone}</span>
                  <span className="sw-contact-detail">{c.email}</span>
                </div>
                <div className="sw-contact-actions">
                  {!c.isPrimary && (
                    <button
                      className="sw-button-text"
                      onClick={() => handleSetPrimary(c.id)}
                      aria-label={`Set ${c.name} as primary contact`}
                    >
                      Set primary
                    </button>
                  )}
                  <button
                    className="sw-button-text"
                    onClick={() => handleEdit(c)}
                    aria-label={`Edit ${c.name}`}
                  >
                    Edit
                  </button>
                  <button
                    className="sw-button-text sw-button-text--danger"
                    onClick={() => handleDelete(c.id)}
                    aria-label={`Delete ${c.name}`}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="sw-contacts-empty">
            No contacts yet. Add your first trusted contact below.
          </p>
        )}
      </section>

      {!atLimit && (
        <section
          className="sw-contacts-form-card"
          aria-label={editingId ? "Edit contact form" : "Add contact form"}
        >
          <h2 className="sw-contacts-form-title">
            {editingId ? "Edit Contact" : "Add Contact"}
          </h2>

          <div className="sw-form-field">
            <label htmlFor="contact-name" className="sw-form-label">Full name</label>
            <input
              id="contact-name"
              className={errors.name ? "sw-form-input sw-form-input--error" : "sw-form-input"}
              type="text"
              placeholder="Jane Smith"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              aria-describedby={errors.name ? "contact-name-error" : undefined}
              aria-invalid={!!errors.name}
            />
            {errors.name && (
              <span id="contact-name-error" className="sw-form-error" role="alert">
                {errors.name}
              </span>
            )}
          </div>

          <div className="sw-form-field">
            <label htmlFor="contact-phone" className="sw-form-label">Phone number</label>
            <input
              id="contact-phone"
              className={errors.phone ? "sw-form-input sw-form-input--error" : "sw-form-input"}
              type="tel"
              placeholder="+1 (555) 000-0000"
              value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              aria-describedby={errors.phone ? "contact-phone-error" : undefined}
              aria-invalid={!!errors.phone}
            />
            {errors.phone && (
              <span id="contact-phone-error" className="sw-form-error" role="alert">
                {errors.phone}
              </span>
            )}
          </div>

          <div className="sw-form-field">
            <label htmlFor="contact-email" className="sw-form-label">Email address</label>
            <input
              id="contact-email"
              className={errors.email ? "sw-form-input sw-form-input--error" : "sw-form-input"}
              type="email"
              placeholder="jane@example.com"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              aria-describedby={errors.email ? "contact-email-error" : undefined}
              aria-invalid={!!errors.email}
            />
            {errors.email && (
              <span id="contact-email-error" className="sw-form-error" role="alert">
                {errors.email}
              </span>
            )}
          </div>

          <div className="sw-form-actions">
            <button
              className="sw-button sw-button--primary"
              onClick={handleSubmit}
              disabled={saving}
            >
              {saving ? "Saving…" : editingId ? "Save Changes" : "Add Contact"}
            </button>
            {editingId && (
              <button className="sw-button sw-button--ghost" onClick={handleCancel}>
                Cancel
              </button>
            )}
          </div>
        </section>
      )}

      {atLimit && (
        <p className="sw-contacts-limit-note" role="status">
          Maximum of {MAX_CONTACTS} contacts reached. Delete one to add another.
        </p>
      )}
    </div>
  );
}

export default ContactsPage;
