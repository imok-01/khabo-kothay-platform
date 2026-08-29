import { useCallback, useEffect, useState } from 'react';
import type { Menu } from '../domain/menu';
import type { MenuStatus } from '../integrations/supabase/database.types';
import { menuRepository } from '../repositories/menuRepository';
import { KK_DEMO_RESTAURANT_ID } from '../data/devSimulation';

export interface OwnerMenuState {
  status: 'loading' | 'ready' | 'empty' | 'error';
  menu: Menu | null;
  menuStatus: MenuStatus | null;
  menuId: string | null;
  loading: boolean;
  canEdit: boolean;
  saving: boolean;
  submitting: boolean;
  /**
   * True when the working draft exists in this browser only — the demo venue's
   * fallback (see DEMO DRAFTS below). The UI must say so wherever it describes
   * what happens next, because for a local draft the answer is "nothing".
   */
  localDraft: boolean;
  /** Persist the current editor content as a DRAFT (creates one if needed). */
  saveDraft: (menu: Menu) => Promise<void>;
  /** DRAFT -> PENDING_REVIEW. */
  submitForReview: () => Promise<void>;
  /** Create a fresh DRAFT, forking the currently loaded (readable) menu. */
  createDraft: () => Promise<void>;
  reload: () => void;
}

/* ------------------------------------------------------------------ */
/* DEMO DRAFTS                                                         */
/*                                                                     */
/* A menu write needs an authenticated owner. The demo logins are not   */
/* authenticated against Supabase at all — a create-draft POST arrives  */
/* as role `anon` and comes back 401 / 42501 "permission denied for     */
/* table menus". Measured, not assumed.                                 */
/*                                                                     */
/* That is correct for a real venue: nobody should be able to edit      */
/* Almajlis's menu from a demo phone number, and the error now says so  */
/* accurately. But KK Demo Restaurant exists precisely to demonstrate   */
/* the lifecycle, so when the backend refuses it, the draft is kept     */
/* here instead — in memory, for the life of the page, keyed by slug so */
/* it survives moving between console tabs.                             */
/*                                                                     */
/* This is NOT a repository swap: reads still come from Supabase for    */
/* every venue including this one, and no other restaurant can reach    */
/* this path. It is a write fallback for one demonstration venue, and   */
/* the UI labels every draft that lands here.                           */
/* ------------------------------------------------------------------ */

const DEMO_DRAFT_ID = 'demo-draft';
const demoDrafts = new Map<string, { menu: Menu; status: MenuStatus }>();


/**
 * Owner menu edit workflow hook.
 *
 * Loads the restaurant's editable ("working") menu — DRAFT > PENDING_REVIEW >
 * PUBLISHED — and exposes save / submit / create-draft actions. All writes go
 * through `menuRepository`, which enforces ownership via RLS (no privilege
 * escalation, no service-role bypass). Resolves the restaurant UUID from the
 * route slug internally.
 */
export function useOwnerMenu(restaurantSlug: string, actorId: string): OwnerMenuState {
  const [state, setState] = useState<{
    status: OwnerMenuState['status'];
    menu: Menu | null;
    menuStatus: MenuStatus | null;
    menuId: string | null;
    loading: boolean;
  }>({ status: 'loading', menu: null, menuStatus: null, menuId: null, loading: true });
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    const held = demoDrafts.get(restaurantSlug);
    if (held) {
      setState({
        status: 'ready',
        menu: held.menu,
        menuStatus: held.status,
        menuId: DEMO_DRAFT_ID,
        loading: false,
      });
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    try {
      const res = await menuRepository.fetchOwnerMenu(restaurantSlug);
      setState({
        status: res.menu ? 'ready' : 'empty',
        menu: res.menu,
        menuStatus: res.status,
        menuId: res.menuId,
        loading: false,
      });
    } catch {
      setState({ status: 'error', menu: null, menuStatus: null, menuId: null, loading: false });
    }
  }, [restaurantSlug]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveDraft = useCallback(
    async (menu: Menu) => {
      setSaving(true);
      try {
        if (state.menuId === DEMO_DRAFT_ID) {
          demoDrafts.set(restaurantSlug, { menu, status: 'DRAFT' });
          setState((s) => ({ ...s, menuStatus: 'DRAFT', menu }));
          return;
        }
        let id = state.menuId;
        if (!id) id = (await menuRepository.createMenuDraft(restaurantSlug, actorId)) ?? null;
        // A null id used to end the function quietly, which is how a Save button
        // came to do nothing at all and say nothing about it.
        if (!id) throw new Error('The backend did not return a draft to save into.');
        await menuRepository.saveMenuDraftContent(id, menu, actorId);
        setState((s) => ({ ...s, menuId: id, menuStatus: 'DRAFT', menu }));
      } finally {
        setSaving(false);
      }
    },
    [state.menuId, restaurantSlug, actorId],
  );

  const submitForReview = useCallback(async () => {
    if (!state.menuId) return;
    setSubmitting(true);
    try {
      if (state.menuId === DEMO_DRAFT_ID) {
        const held = demoDrafts.get(restaurantSlug);
        if (held) held.status = 'PENDING_REVIEW';
        setState((s) => ({ ...s, menuStatus: 'PENDING_REVIEW' }));
        return;
      }
      await menuRepository.submitMenuForReview(state.menuId, actorId);
      setState((s) => ({ ...s, menuStatus: 'PENDING_REVIEW' }));
    } finally {
      setSubmitting(false);
    }
  }, [state.menuId, restaurantSlug, actorId]);

  const createDraft = useCallback(async () => {
    // Fork from the currently displayed (RLS-readable) menu content so the owner
    // starts from their live menu rather than an empty sheet.
    const base = state.menu ?? { restaurantId: restaurantSlug, categories: [], updatedAt: new Date().toISOString() };
    setSaving(true);
    try {
      const id = await menuRepository.createMenuDraft(restaurantSlug, actorId);
      if (!id) throw new Error('The backend did not create a draft.');
      await menuRepository.saveMenuDraftContent(id, base, actorId);
      setState((s) => ({ ...s, menuId: id, menuStatus: 'DRAFT', menu: base }));
    } catch (err) {
      // The demonstration venue keeps its draft locally rather than dead-ending;
      // every other restaurant reports the real failure to the caller.
      if (restaurantSlug !== KK_DEMO_RESTAURANT_ID) throw err;
      demoDrafts.set(restaurantSlug, { menu: base, status: 'DRAFT' });
      setState((s) => ({ ...s, menuId: DEMO_DRAFT_ID, menuStatus: 'DRAFT', menu: base }));
    } finally {
      setSaving(false);
    }
  }, [restaurantSlug, actorId, state.menu]);

  return {
    status: state.status,
    menu: state.menu,
    menuStatus: state.menuStatus,
    menuId: state.menuId,
    loading: state.loading,
    canEdit: state.menuStatus === 'DRAFT',
    saving,
    submitting,
    localDraft: state.menuId === DEMO_DRAFT_ID,
    saveDraft,
    submitForReview,
    createDraft,
    reload: load,
  };
}
