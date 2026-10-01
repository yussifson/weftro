import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useChatDock = create(
  persist(
    (set) => ({
      isChatDocked: false,
      dockWidth: 400,
      toggleChatDock: () => set((state) => ({ isChatDocked: !state.isChatDocked })),
      setChatDock: (val) => set({ isChatDocked: val }),
      setDockWidth: (width) => set({ dockWidth: width }),
    }),
    {
      name: 'chat-dock-storage',
    }
  )
);
