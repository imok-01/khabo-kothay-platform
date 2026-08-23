import { useCallback, useEffect, useState } from 'react';
import type { Menu } from '../domain/menu';
import type { MenuStatus } from '../integrations/supabase/database.types';
import { menuRepository } from '../repositories/menuRepository';

export interface OwnerMenuState {
  status: 'loading' | 'ready' | 'empty' | 'error';
  menu: Menu | null;
  menuStatus: MenuStatus | null;
  menuId: string | null;
  loading: boolean;
  canEdit: boolean;
  saving: boolean;
  submitting: boolean;
  /** Persist the current editor content as a DRAFT (creates one if needed). */
  saveDraft: (menu: Menu) => Promise<void>;
  /** DRAFT -> PENDING_REVIEW. */
  submitForReview: () => Promise<void>;
  /** Create a fresh DRAFT, forking the currently loaded (readable) menu. */
  createDraft: () => Promise<void>;
  reload: () => void;
}

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
        let id = state.menuId;
        if (!id) id = (await menuRepository.createMenuDraft(restaurantSlug, actorId)) ?? null;
        if (!id) return;
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
      await menuRepository.submitMenuForReview(state.menuId, actorId);
      setState((s) => ({ ...s, menuStatus: 'PENDING_REVIEW' }));
    } finally {
      setSubmitting(false);
    }
  }, [state.menuId, actorId]);

  const createDraft = useCallback(async () => {
    const id = await menuRepository.createMenuDraft(restaurantSlug, actorId);
    if (!id) return;
    // Fork from the currently displayed (RLS-readable) menu content so the owner
    // starts from their live menu rather than an empty sheet.
    const base = state.menu ?? { restaurantId: restaurantSlug, categories: [], updatedAt: new Date().toISOString() };
    await menuRepository.saveMenuDraftContent(id, base, actorId);
    setState((s) => ({ ...s, menuId: id, menuStatus: 'DRAFT', menu: base }));
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
    saveDraft,
    submitForReview,
    createDraft,
    reload: load,
  };
}
