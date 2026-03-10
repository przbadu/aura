import { create } from "zustand";
import type { Skill, CreateSkillPayload, UpdateSkillPayload } from "@/lib/api";
import * as api from "@/lib/api";

interface SkillsState {
  skills: Skill[];
  activeSkillId: string | null;
  isLoading: boolean;
  isSaving: boolean;

  // Draft state for the editor
  draft: Partial<CreateSkillPayload> | null;
  isDirty: boolean;

  // Actions
  fetchSkills: () => Promise<void>;
  setActiveSkill: (id: string | null) => void;
  createSkill: (payload: CreateSkillPayload) => Promise<Skill>;
  updateSkill: (id: string, payload: UpdateSkillPayload) => Promise<void>;
  deleteSkill: (id: string) => Promise<void>;
  toggleShare: (id: string) => Promise<void>;
  setDraft: (draft: Partial<CreateSkillPayload> | null) => void;
  updateDraft: (fields: Partial<CreateSkillPayload>) => void;
  setIsDirty: (dirty: boolean) => void;
  startNewSkill: () => void;
}

const EMPTY_DRAFT: CreateSkillPayload = {
  name: "",
  description: "",
  instructions: "",
  enabled: true,
};

export const useSkillsStore = create<SkillsState>((set, get) => ({
  skills: [],
  activeSkillId: null,
  isLoading: false,
  isSaving: false,
  draft: null,
  isDirty: false,

  fetchSkills: async () => {
    set({ isLoading: true });
    try {
      const skills = await api.fetchSkills();
      set({ skills, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  setActiveSkill: (id: string | null) => {
    const skill = id ? get().skills.find((s) => s.id === id) : null;
    set({
      activeSkillId: id,
      draft: skill
        ? {
            name: skill.name,
            description: skill.description,
            instructions: skill.instructions,
            enabled: skill.enabled,
          }
        : null,
      isDirty: false,
    });
  },

  createSkill: async (payload: CreateSkillPayload) => {
    set({ isSaving: true });
    try {
      const skill = await api.createSkill(payload);
      set((state) => ({
        skills: [skill, ...state.skills],
        activeSkillId: skill.id,
        draft: {
          name: skill.name,
          description: skill.description,
          instructions: skill.instructions,
          enabled: skill.enabled,
        },
        isDirty: false,
        isSaving: false,
      }));
      return skill;
    } catch (error) {
      set({ isSaving: false });
      throw error;
    }
  },

  updateSkill: async (id: string, payload: UpdateSkillPayload) => {
    set({ isSaving: true });
    try {
      const updated = await api.updateSkill(id, payload);
      set((state) => ({
        skills: state.skills.map((s) => (s.id === id ? updated : s)),
        draft: {
          name: updated.name,
          description: updated.description,
          instructions: updated.instructions,
          enabled: updated.enabled,
        },
        isDirty: false,
        isSaving: false,
      }));
    } catch (error) {
      set({ isSaving: false });
      throw error;
    }
  },

  deleteSkill: async (id: string) => {
    try {
      await api.deleteSkill(id);
      const { activeSkillId } = get();
      set((state) => ({
        skills: state.skills.filter((s) => s.id !== id),
        activeSkillId: activeSkillId === id ? null : activeSkillId,
        draft: activeSkillId === id ? null : state.draft,
        isDirty: activeSkillId === id ? false : state.isDirty,
      }));
    } catch (error) {
      throw error;
    }
  },

  toggleShare: async (id: string) => {
    try {
      const updated = await api.toggleSkillShare(id);
      set((state) => ({
        skills: state.skills.map((s) => (s.id === id ? updated : s)),
      }));
    } catch (error) {
      throw error;
    }
  },

  setDraft: (draft) => set({ draft }),

  updateDraft: (fields) =>
    set((state) => ({
      draft: state.draft ? { ...state.draft, ...fields } : fields,
      isDirty: true,
    })),

  setIsDirty: (dirty) => set({ isDirty: dirty }),

  startNewSkill: () =>
    set({
      activeSkillId: null,
      draft: { ...EMPTY_DRAFT },
      isDirty: false,
    }),
}));
