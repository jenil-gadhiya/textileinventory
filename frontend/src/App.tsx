import { Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { AddStockEntryPage } from "@/pages/AddStockEntry";
import { MachineListPage } from "@/pages/machines/MachineList";
import { MachineFormPage } from "@/pages/machines/MachineForm";
import { PartyListPage } from "@/pages/parties/PartyList";
import { PartyFormPage } from "@/pages/parties/PartyForm";
import { DesignListPage } from "@/pages/designs/DesignList";
import { DesignFormPage } from "@/pages/designs/DesignForm";
import { MachineReportPage } from "@/pages/reports/MachineReport";
import { PartyReportPage } from "@/pages/reports/PartyReport";
import { DateReportPage } from "@/pages/reports/DateReport";
import { DashboardPage } from "@/pages/Dashboard";
import { SettingsPage } from "@/pages/Settings";
import { StockListPage } from "@/pages/StockList";
import { QualitiesPage } from "@/pages/parameters/Qualities";
import { MatchingsPage } from "@/pages/parameters/Matchings";
import { ImagesPage } from "@/pages/parameters/Images";
import { FactoriesPage } from "@/pages/parameters/Factories";
import { CatalogListPage } from "@/pages/catalog/CatalogList";
import { CatalogFormPage } from "@/pages/catalog/CatalogForm";
import { ProductionEntryPage } from "@/pages/production/ProductionEntry";
import { ProductionListPage } from "@/pages/production/ProductionList";
import { BrokerListPage } from "@/pages/brokers/BrokerList";
import { BrokerFormPage } from "@/pages/brokers/BrokerForm";
import { SalesmanListPage } from "@/pages/salesmen/SalesmanList";
import { SalesmanFormPage } from "@/pages/salesmen/SalesmanForm";
import { OrderListPage } from "@/pages/orders/OrderList";
import { OrderEntryPage } from "@/pages/orders/OrderEntry";
import { StockReportPage } from "@/pages/inventory/StockReport";
import { ChallanCreatePage } from "@/pages/challan/ChallanCreate";
import { ChallanListPage } from "@/pages/challan/ChallanList";

export default function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route path="/dashboard" element={<DashboardPage />} />

        <Route path="/stock/new" element={<AddStockEntryPage />} />
        <Route path="/stock/list" element={<StockListPage />} />

        <Route path="/machines" element={<MachineListPage />} />
        <Route path="/machines/add" element={<MachineFormPage />} />
        <Route path="/machines/edit/:id" element={<MachineFormPage />} />

        <Route path="/parties" element={<PartyListPage />} />
        <Route path="/parties/add" element={<PartyFormPage />} />
        <Route path="/parties/edit/:id" element={<PartyFormPage />} />

        <Route path="/designs" element={<DesignListPage />} />
        <Route path="/designs/add" element={<DesignFormPage />} />
        <Route path="/designs/edit/:id" element={<DesignFormPage />} />

        <Route path="/reports/machine" element={<MachineReportPage />} />
        <Route path="/reports/party" element={<PartyReportPage />} />
        <Route path="/reports/date" element={<DateReportPage />} />

        <Route path="/parameters/qualities" element={<QualitiesPage />} />
        <Route path="/parameters/matchings" element={<MatchingsPage />} />
        <Route path="/parameters/images" element={<ImagesPage />} />
        <Route path="/parameters/factories" element={<FactoriesPage />} />

        <Route path="/catalog" element={<CatalogListPage />} />
        <Route path="/catalog/create" element={<CatalogFormPage />} />
        <Route path="/catalog/edit/:id" element={<CatalogFormPage />} />

        <Route path="/production/create" element={<ProductionEntryPage />} />
        <Route path="/production/edit/:id" element={<ProductionEntryPage />} />
        <Route path="/production/list" element={<ProductionListPage />} />

        <Route path="/brokers" element={<BrokerListPage />} />
        <Route path="/brokers/create" element={<BrokerFormPage />} />
        <Route path="/brokers/edit/:id" element={<BrokerFormPage />} />

        <Route path="/salesmen" element={<SalesmanListPage />} />
        <Route path="/salesmen/create" element={<SalesmanFormPage />} />
        <Route path="/salesmen/edit/:id" element={<SalesmanFormPage />} />

        <Route path="/orders" element={<OrderListPage />} />
        <Route path="/orders/create" element={<OrderEntryPage />} />
        <Route path="/orders/edit/:id" element={<OrderEntryPage />} />

        <Route path="/challans" element={<ChallanListPage />} />
        <Route path="/challans/create" element={<ChallanCreatePage />} />
        <Route path="/challans/edit/:id" element={<ChallanCreatePage />} />

        <Route path="/inventory/report" element={<StockReportPage />} />

        <Route path="/settings" element={<SettingsPage />} />

        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </AppLayout>
  );
}

