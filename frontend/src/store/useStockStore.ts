import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { Design, Factory, Machine, Matching, Party, Quality, StockEntry } from "@/types/stock";
import {
  fetchMachines,
  createMachine,
  updateMachine,
  deleteMachine as apiDeleteMachine
} from "@/api/machines";
import {
  fetchParties,
  createParty,
  updateParty,
  deleteParty as apiDeleteParty
} from "@/api/parties";
import {
  fetchDesigns,
  createDesign,
  updateDesign,
  deleteDesign as apiDeleteDesign
} from "@/api/designs";
import { fetchStocks, createStock, updateStock, deleteStock as apiDeleteStock } from "@/api/stocks";
import {
  fetchQualities,
  createQuality,
  updateQuality,
  deleteQuality as apiDeleteQuality
} from "@/api/qualities";
import {
  fetchMatchings,
  createMatching,
  updateMatching,
  deleteMatching as apiDeleteMatching
} from "@/api/matchings";
import {
  fetchFactories,
  createFactory,
  updateFactory,
  deleteFactory as apiDeleteFactory
} from "@/api/factories";

type StockState = {
  machines: Machine[];
  parties: Party[];
  designs: Design[];
  qualities: Quality[];
  matchings: Matching[];
  factories: Factory[];
  entries: StockEntry[];
  loadAll: () => Promise<void>;
  addEntry: (data: Omit<StockEntry, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  updateEntry: (id: string, data: Partial<StockEntry>) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  addMachine: (data: Omit<Machine, "id">) => Promise<void>;
  updateMachine: (id: string, data: Partial<Machine>) => Promise<void>;
  deleteMachine: (id: string) => Promise<void>;
  addParty: (data: Omit<Party, "id">) => Promise<void>;
  updateParty: (id: string, data: Partial<Party>) => Promise<void>;
  deleteParty: (id: string) => Promise<void>;
  addDesign: (data: Omit<Design, "id">) => Promise<void>;
  updateDesign: (id: string, data: Partial<Design>) => Promise<void>;
  deleteDesign: (id: string) => Promise<void>;
  addQuality: (data: Omit<Quality, "id">) => Promise<void>;
  updateQuality: (id: string, data: Partial<Quality>) => Promise<void>;
  deleteQuality: (id: string) => Promise<void>;
  addMatching: (data: Omit<Matching, "id">) => Promise<void>;
  updateMatching: (id: string, data: Partial<Matching>) => Promise<void>;
  deleteMatching: (id: string) => Promise<void>;
  addFactory: (data: Omit<Factory, "id">) => Promise<void>;
  updateFactory: (id: string, data: Partial<Factory>) => Promise<void>;
  deleteFactory: (id: string) => Promise<void>;
};

export const useStockStore = create<StockState>()(
  devtools((set, get) => ({
    machines: [],
    parties: [],
    designs: [],
    qualities: [],
    matchings: [],
    factories: [],
    entries: [],
    loadAll: async () => {
      const [machines, parties, designs, qualities, matchings, factories, entries] =
        await Promise.all([
          fetchMachines(),
          fetchParties(),
          fetchDesigns(),
          fetchQualities(),
          fetchMatchings(),
          fetchFactories(),
          fetchStocks()
        ]);
      set({ machines, parties, designs, qualities, matchings, factories, entries });
    },
    addEntry: async (data) => {
      const newEntry = await createStock(data);
      set({ entries: [newEntry, ...get().entries] });
    },
    updateEntry: async (id, data) => {
      const updated = await updateStock(id, data);
      set({ entries: get().entries.map((e) => (e.id === id ? updated : e)) });
    },
    deleteEntry: async (id) => {
      await apiDeleteStock(id);
      set({ entries: get().entries.filter((e) => e.id !== id) });
    },
    addMachine: async (data) => {
      const created = await createMachine(data);
      set({ machines: [created, ...get().machines] });
    },
    updateMachine: async (id, data) => {
      const updated = await updateMachine(id, data);
      set({ machines: get().machines.map((m) => (m.id === id ? updated : m)) });
    },
    deleteMachine: async (id) => {
      await apiDeleteMachine(id);
      set({ machines: get().machines.filter((m) => m.id !== id) });
    },
    addParty: async (data) => {
      const created = await createParty(data);
      set({ parties: [created, ...get().parties] });
    },
    updateParty: async (id, data) => {
      const updated = await updateParty(id, data);
      set({ parties: get().parties.map((p) => (p.id === id ? updated : p)) });
    },
    deleteParty: async (id) => {
      await apiDeleteParty(id);
      set({ parties: get().parties.filter((p) => p.id !== id) });
    },
    addDesign: async (data) => {
      const created = await createDesign(data);
      set({ designs: [created, ...get().designs] });
    },
    updateDesign: async (id, data) => {
      const updated = await updateDesign(id, data);
      set({ designs: get().designs.map((d) => (d.id === id ? updated : d)) });
    },
    deleteDesign: async (id) => {
      await apiDeleteDesign(id);
      set({ designs: get().designs.filter((d) => d.id !== id) });
    },
    addQuality: async (data) => {
      const created = await createQuality(data);
      set({ qualities: [created, ...get().qualities] });
    },
    updateQuality: async (id, data) => {
      const updated = await updateQuality(id, data);
      set({ qualities: get().qualities.map((q) => (q.id === id ? updated : q)) });
    },
    deleteQuality: async (id) => {
      await apiDeleteQuality(id);
      set({ qualities: get().qualities.filter((q) => q.id !== id) });
    },
    addMatching: async (data) => {
      const created = await createMatching(data);
      set({ matchings: [created, ...get().matchings] });
    },
    updateMatching: async (id, data) => {
      const updated = await updateMatching(id, data);
      set({ matchings: get().matchings.map((m) => (m.id === id ? updated : m)) });
    },
    deleteMatching: async (id) => {
      await apiDeleteMatching(id);
      set({ matchings: get().matchings.filter((m) => m.id !== id) });
    },
    addFactory: async (data) => {
      const created = await createFactory(data);
      set({ factories: [created, ...get().factories] });
    },
    updateFactory: async (id, data) => {
      const updated = await updateFactory(id, data);
      set({ factories: get().factories.map((f) => (f.id === id ? updated : f)) });
    },
    deleteFactory: async (id) => {
      await apiDeleteFactory(id);
      set({ factories: get().factories.filter((f) => f.id !== id) });
    }
  }))
);

