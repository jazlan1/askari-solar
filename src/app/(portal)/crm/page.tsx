"use client";

import { useEffect, useState } from "react";
import {
  Users,
  Search,
  Plus,
  TrendingUp,
  MapPin,
  Phone,
  FileText,
  DollarSign,
  Heart,
  Wrench,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  ClipboardList,
  Sparkles,
  Printer,
  Calendar,
  X,
  Package,
  Activity,
  Layers,
  AlertTriangle,
  Loader2
} from "lucide-react";
import { useStore } from "@/store/useStore";

export default function CRMPage() {
  const { user } = useStore();
  const userRoles = (user?.role || "").split(",").map(r => r.trim());
  const isAllowed = user && userRoles.some(r => ["Admin", "Super Admin", "Management", "Sales & Marketing Department"].includes(r));
  const isPricingPrivileged = user && userRoles.some(r => ["Admin", "HR", "Sales & Marketing Department", "Management"].includes(r));

  const [activeTab, setActiveTab] = useState<"leads" | "customers" | "quotes" | "products" | "tickets">("leads");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");

  // Lead Kanban modal / details
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [showCreateLeadModal, setShowCreateLeadModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Lead form state
  const [leadName, setLeadName] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [leadCnic, setLeadCnic] = useState("");
  const [leadAddress, setLeadAddress] = useState("");
  const [leadCity, setLeadCity] = useState("Islamabad");
  const [leadBill, setLeadBill] = useState("");
  const [leadUnits, setLeadUnits] = useState("");
  const [leadLoad, setLeadLoad] = useState("5.0");
  const [leadSource, setLeadSource] = useState("Campaign");
  const [leadCampaign, setLeadCampaign] = useState("Summer Promo");
  const [leadNotes, setLeadNotes] = useState("");
  const [staffUsers, setStaffUsers] = useState<any[]>([]);
  const [leadAssignedTo, setLeadAssignedTo] = useState("");

  // Lead win states
  const [showWinModal, setShowWinModal] = useState(false);
  const [leadCompletionProof, setLeadCompletionProof] = useState("");
  const [uploadingWinFile, setUploadingWinFile] = useState(false);
  const [winUploadError, setWinUploadError] = useState<string | null>(null);
  const [pendingWinLeadId, setPendingWinLeadId] = useState<number | null>(null);

  // Customer selection
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  // Lead edit states
  const [isEditingLead, setIsEditingLead] = useState(false);
  const [editLeadName, setEditLeadName] = useState("");
  const [editLeadPhone, setEditLeadPhone] = useState("");
  const [editLeadCity, setEditLeadCity] = useState("");
  const [editLeadAddress, setEditLeadAddress] = useState("");
  const [editLeadBill, setEditLeadBill] = useState("");
  const [editLeadUnits, setEditLeadUnits] = useState("");
  const [editLeadLoad, setEditLeadLoad] = useState("");
  const [editLeadNotes, setEditLeadNotes] = useState("");

  // Customer edit states
  const [showEditCustomerModal, setShowEditCustomerModal] = useState(false);
  const [editCustomerName, setEditCustomerName] = useState("");
  const [editCustomerPhone, setEditCustomerPhone] = useState("");
  const [editCustomerCnic, setEditCustomerCnic] = useState("");
  const [editCustomerCity, setEditCustomerCity] = useState("");
  const [editCustomerEmail, setEditCustomerEmail] = useState("");

  // Project edit states
  const [showEditProjectModal, setShowEditProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [editProjectName, setEditProjectName] = useState("");
  const [editProjectStage, setEditProjectStage] = useState("Survey");
  const [editProjectSurvey, setEditProjectSurvey] = useState("");
  const [editProjectApproval, setEditProjectApproval] = useState("");
  const [editProjectMaterial, setEditProjectMaterial] = useState("");
  const [editProjectInstallation, setEditProjectInstallation] = useState("");
  const [editProjectInspection, setEditProjectInspection] = useState("");
  const [editProjectNetMetering, setEditProjectNetMetering] = useState("");
  const [editProjectWarranty, setEditProjectWarranty] = useState("");
  const [editProjectNotes, setEditProjectNotes] = useState("");

  // Ticket edit states
  const [showEditTicketModal, setShowEditTicketModal] = useState(false);
  const [editingTicket, setEditingTicket] = useState<any>(null);
  const [editTicketSubject, setEditTicketSubject] = useState("");
  const [editTicketDescription, setEditTicketDescription] = useState("");
  const [editTicketType, setEditTicketType] = useState("Complaint");
  const [editTicketStatus, setEditTicketStatus] = useState("Open");

  useEffect(() => {
    if (selectedLead) {
      setEditLeadName(selectedLead.name || "");
      setEditLeadPhone(selectedLead.phone || "");
      setEditLeadCity(selectedLead.city || "");
      setEditLeadAddress(selectedLead.address || "");
      setEditLeadBill(selectedLead.electricityBill?.toString() || "");
      setEditLeadUnits(selectedLead.monthlyUnits?.toString() || "");
      setEditLeadLoad(selectedLead.load?.toString() || "");
      setEditLeadNotes(selectedLead.notes || "");
      setIsEditingLead(false);
    }
  }, [selectedLead]);

  // Support ticket form state
  const [ticketCustId, setTicketCustId] = useState("");
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketDesc, setTicketDesc] = useState("");
  const [ticketType, setTicketType] = useState("Complaint");
  const [showCreateTicketModal, setShowCreateTicketModal] = useState(false);

  // Quotation Generator state
  const [quoteClient, setQuoteClient] = useState("");
  const [quotePhone, setQuotePhone] = useState("");
  const [quoteLoc, setQuoteLoc] = useState("Islamabad");
  const [quoteSystemSize, setQuoteSystemSize] = useState("10"); // kW
  const [selectedPanel, setSelectedPanel] = useState<any>(null);
  const [panelQty, setPanelQty] = useState(18);
  const [selectedInverter, setSelectedInverter] = useState<any>(null);
  const [selectedBattery, setSelectedBattery] = useState<any>(null);
  const [batteryQty, setBatteryQty] = useState(1);
  const [quoteResult, setQuoteResult] = useState<any>(null);

  async function fetchCRMData() {
    try {
      const res = await fetch("/api/crm/data");
      if (res.ok) {
        const fetched = await res.json();
        setData(fetched);
        
        // Pick default panels/inverters for quote generator
        if (fetched.products?.length > 0) {
          const panel = fetched.products.find((p: any) => p.category === "Solar Panels");
          const inverter = fetched.products.find((p: any) => p.category === "Inverters");
          const battery = fetched.products.find((p: any) => p.category === "Batteries");
          if (panel) setSelectedPanel(panel);
          if (inverter) setSelectedInverter(inverter);
          if (battery) setSelectedBattery(battery);
        }
      }
      
      const usersRes = await fetch("/api/users");
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setStaffUsers(usersData.users || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user) {
      if (isAllowed) {
        fetchCRMData();
      } else {
        setLoading(false);
      }
    }
  }, [user, isAllowed]);

  // Action handlers
  async function handleCreateLead(e: React.FormEvent) {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch("/api/crm/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CREATE_LEAD",
          name: leadName,
          phone: leadPhone,
          cnic: leadCnic,
          address: leadAddress,
          city: leadCity,
          electricityBill: leadBill,
          monthlyUnits: leadUnits,
          load: leadLoad,
          source: leadSource,
          campaign: leadCampaign,
          notes: leadNotes,
          salesPersonId: leadAssignedTo || null,
        }),
      });

      if (res.ok) {
        setShowCreateLeadModal(false);
        // Clear form
        setLeadName("");
        setLeadPhone("");
        setLeadCnic("");
        setLeadAddress("");
        setLeadBill("");
        setLeadUnits("");
        setLeadNotes("");
        setLeadAssignedTo("");
        fetchCRMData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleUpdateLeadStatus(leadId: number, newStatus: string) {
    if (newStatus === "Won" && !leadCompletionProof) {
      setPendingWinLeadId(leadId);
      setShowWinModal(true);
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch("/api/crm/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_LEAD_STATUS",
          leadId,
          status: newStatus,
          completionProof: leadCompletionProof || undefined,
        }),
      });

      if (res.ok) {
        setLeadCompletionProof("");
        setPendingWinLeadId(null);
        setSelectedLead(null);
        fetchCRMData();
      } else {
        const err = await res.json();
        alert(err.error || "Update failed");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleWinFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingWinFile(true);
    setWinUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/tasks/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.fileUrl) {
        setLeadCompletionProof(data.fileUrl);
      } else {
        setWinUploadError(data.error || "Failed to upload completion proof");
      }
    } catch (err) {
      console.error(err);
      setWinUploadError("Error uploading file. Please try again.");
    } finally {
      setUploadingWinFile(false);
    }
  }

  async function submitLeadCompletion() {
    if (!leadCompletionProof) {
      alert("Please upload a completion proof file.");
      return;
    }
    setShowWinModal(false);
    if (pendingWinLeadId) {
      await handleUpdateLeadStatus(pendingWinLeadId, "Won");
    }
  }



  async function handleReassignLead(leadId: number, salesPersonId: string) {
    setActionLoading(true);
    try {
      const res = await fetch("/api/crm/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REASSIGN_LEAD",
          leadId,
          salesPersonId: salesPersonId ? parseInt(salesPersonId) : null,
        }),
      });
      if (res.ok) {
        setSelectedLead(null);
        fetchCRMData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  }

  // --- CRM DATA SAVE EDIT HANDLERS ---
  async function handleSaveLeadEdit() {
    try {
      setActionLoading(true);
      const res = await fetch("/api/crm/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_LEAD",
          leadId: selectedLead.id,
          name: editLeadName,
          phone: editLeadPhone,
          city: editLeadCity,
          address: editLeadAddress,
          electricityBill: editLeadBill,
          monthlyUnits: editLeadUnits,
          load: editLeadLoad,
          notes: editLeadNotes,
        }),
      });
      if (res.ok) {
        const body = await res.json();
        setSelectedLead(body.lead);
        fetchCRMData();
        setIsEditingLead(false);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to update lead");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving lead changes");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSaveCustomerEdit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setActionLoading(true);
      const res = await fetch("/api/crm/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_CUSTOMER",
          customerId: selectedCustomer.id,
          name: editCustomerName,
          phone: editCustomerPhone,
          cnic: editCustomerCnic,
          city: editCustomerCity,
          email: editCustomerEmail,
        }),
      });
      if (res.ok) {
        const body = await res.json();
        setSelectedCustomer({ ...selectedCustomer, ...body.customer });
        fetchCRMData();
        setShowEditCustomerModal(false);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to update customer");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving customer changes");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSaveProjectEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingProject) return;
    try {
      setActionLoading(true);
      const res = await fetch("/api/crm/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_PROJECT",
          projectId: editingProject.id,
          name: editProjectName,
          stage: editProjectStage,
          surveyDetails: editProjectSurvey,
          approvalStatus: editProjectApproval,
          materialOrdered: editProjectMaterial,
          installationDate: editProjectInstallation,
          inspectionDate: editProjectInspection,
          netMeteringStatus: editProjectNetMetering,
          warrantyYears: editProjectWarranty,
          notes: editProjectNotes,
        }),
      });
      if (res.ok) {
        const body = await res.json();
        const updatedProjects = selectedCustomer.projects.map((p: any) => p.id === body.project.id ? body.project : p);
        setSelectedCustomer({ ...selectedCustomer, projects: updatedProjects });
        fetchCRMData();
        setShowEditProjectModal(false);
        setEditingProject(null);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to update project");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving project changes");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSaveTicketEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingTicket) return;
    try {
      setActionLoading(true);
      const res = await fetch("/api/crm/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_TICKET",
          ticketId: editingTicket.id,
          subject: editTicketSubject,
          description: editTicketDescription,
          type: editTicketType,
          status: editTicketStatus,
        }),
      });
      if (res.ok) {
        const body = await res.json();
        const updatedTickets = selectedCustomer.tickets.map((t: any) => t.id === body.ticket.id ? body.ticket : t);
        setSelectedCustomer({ ...selectedCustomer, tickets: updatedTickets });
        fetchCRMData();
        setShowEditTicketModal(false);
        setEditingTicket(null);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to update ticket");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving ticket changes");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCreateTicket(e: React.FormEvent) {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch("/api/crm/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CREATE_TICKET",
          customerId: ticketCustId,
          subject: ticketSubject,
          description: ticketDesc,
          type: ticketType,
        }),
      });

      if (res.ok) {
        setShowCreateTicketModal(false);
        setTicketCustId("");
        setTicketSubject("");
        setTicketDesc("");
        fetchCRMData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  }

  // Quotation Calculation
  function calculateQuotation() {
    if (!selectedPanel || !selectedInverter) return;

    const panelTotal = selectedPanel.rate * panelQty;
    const inverterTotal = selectedInverter.rate;
    const batteryTotal = selectedBattery ? selectedBattery.rate * batteryQty : 0;
    
    // Standard auxiliary estimates (Cables, Protection, Mounting Stand Structure)
    const structureCost = 45000 * Math.ceil(panelQty / 4); // 45k per panel stand structure array
    const cablesCost = 65000;
    const accessoriesCost = 35000;
    const installationCost = 50000; // flat rate installer fees

    const subtotal = panelTotal + inverterTotal + batteryTotal + structureCost + cablesCost + accessoriesCost + installationCost;
    const salesTax = subtotal * 0.17; // 17% sales tax
    const grandTotal = subtotal + salesTax;

    setQuoteResult({
      title: `${quoteSystemSize} kW Solar System Quotation`,
      clientName: quoteClient || "Walk-In Client",
      clientNumber: quotePhone || "--",
      location: quoteLoc,
      systemSize: quoteSystemSize,
      items: [
        { name: `${selectedPanel.name}`, qty: panelQty, rate: selectedPanel.rate, total: panelTotal },
        { name: `${selectedInverter.name}`, qty: 1, rate: selectedInverter.rate, total: inverterTotal },
        ...(selectedBattery ? [{ name: `${selectedBattery.name}`, qty: batteryQty, rate: selectedBattery.rate, total: batteryTotal }] : []),
        { name: "Solar mounting structures & mounting stands", qty: Math.ceil(panelQty / 4), rate: 45000, total: structureCost },
        { name: "AC/DC Solar Cables & Protection components", qty: 1, rate: cablesCost + accessoriesCost, total: cablesCost + accessoriesCost },
        { name: "Civil works, electrical setup & installation services", qty: 1, rate: installationCost, total: installationCost }
      ],
      subtotal,
      salesTax,
      grandTotal
    });
  }

  async function handleSaveQuotation() {
    if (!quoteResult) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/crm/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CREATE_QUOTATION",
          title: quoteResult.title,
          clientName: quoteResult.clientName,
          clientNumber: quoteResult.clientNumber,
          location: quoteResult.location,
          amount: quoteResult.grandTotal,
          details: quoteResult,
        }),
      });

      if (res.ok) {
        // Switch tab to view saved
        setActiveTab("quotes");
        fetchCRMData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  }

  if (user && !isAllowed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4 animate-fade-in">
        <AlertTriangle className="h-12 w-12 text-red-500 animate-bounce" />
        <h2 className="text-xl font-bold text-zinc-200">Access Denied</h2>
        <p className="text-sm text-zinc-500 max-w-md">
          You do not have permissions to access the CRM & Sales Management module. Please contact your system administrator.
        </p>
      </div>
    );
  }

  if (loading || !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] space-y-3">
        <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
        <span className="text-xs text-zinc-550">Authenticating access...</span>
      </div>
    );
  }

  // --- KANBAN CONFIGURATION ---
  const stages = ["New", "Contacted", "Survey Scheduled", "Quotation Sent", "Negotiation", "Won", "Lost"];
  const getLeadsByStage = (stage: string) => {
    if (!data?.leads) return [];
    return data.leads.filter(
      (l: any) =>
        l.status === stage &&
        (searchQuery ? l.name.toLowerCase().includes(searchQuery.toLowerCase()) : true)
    );
  };

  const getFilteredCustomers = () => {
    if (!data?.customers) return [];
    if (!searchQuery) return data.customers;
    return data.customers.filter((c: any) => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  };

  const getFilteredProducts = () => {
    if (!data?.products) return [];
    if (!searchQuery) return data.products;
    return data.products.filter((p: any) => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
  };

  return (
    <div className="space-y-6 animate-fade-in relative z-10">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <Heart className="h-6 w-6 text-amber-500" />
            <span>Customer Relationship Management</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">Manage leads pipelines, client accounts, quotation setups, and support tickets</p>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-zinc-900 border border-zinc-800 p-1 rounded-xl w-fit flex-wrap">
          <button
            onClick={() => { setActiveTab("leads"); setSearchQuery(""); }}
            className={`px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === "leads" ? "bg-amber-500 text-zinc-950" : "text-zinc-400 hover:text-white"
            }`}
          >
            Leads Pipeline
          </button>
          <button
            onClick={() => { setActiveTab("customers"); setSearchQuery(""); setSelectedCustomer(null); }}
            className={`px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === "customers" ? "bg-amber-500 text-zinc-950" : "text-zinc-400 hover:text-white"
            }`}
          >
            Client Directory
          </button>
          <button
            onClick={() => { setActiveTab("quotes"); }}
            className={`px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === "quotes" ? "bg-amber-500 text-zinc-950" : "text-zinc-400 hover:text-white"
            }`}
          >
            Solar Quote Builder
          </button>
          <button
            onClick={() => { setActiveTab("products"); setSearchQuery(""); }}
            className={`px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === "products" ? "bg-amber-500 text-zinc-950" : "text-zinc-400 hover:text-white"
            }`}
          >
            Product Catalog
          </button>
          <button
            onClick={() => { setActiveTab("tickets"); }}
            className={`px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === "tickets" ? "bg-amber-500 text-zinc-950" : "text-zinc-400 hover:text-white"
            }`}
          >
            Service Tickets
          </button>
        </div>
      </div>

      {/* --- TAB CONTENT: LEADS KANBAN --- */}
      {activeTab === "leads" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Search leads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full glass-input rounded-lg py-2 pl-9 pr-3 text-xs text-white placeholder-zinc-500 focus:outline-none"
              />
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
            </div>

            <button
              onClick={() => setShowCreateLeadModal(true)}
              className="flex items-center gap-1 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-lg text-xs transition cursor-pointer self-stretch sm:self-auto justify-center"
            >
              <Plus className="h-4 w-4" />
              <span>Capture Lead</span>
            </button>
          </div>

          {/* Kanban Board Layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4 overflow-x-auto pb-4">
            {stages.map((stage) => {
              const leads = getLeadsByStage(stage);
              return (
                <div key={stage} className="bg-zinc-900/50 rounded-xl p-3 border border-zinc-900 flex flex-col min-w-[200px] h-[600px]">
                  <div className="flex justify-between items-center pb-2 border-b border-zinc-800 mb-3">
                    <span className="text-xs font-bold text-zinc-200">{stage}</span>
                    <span className="bg-zinc-800 text-[10px] text-zinc-400 font-bold px-2 py-0.5 rounded-full">
                      {leads.length}
                    </span>
                  </div>

                  <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                    {leads.map((lead: any) => (
                      <div
                        key={lead.id}
                        onClick={() => setSelectedLead(lead)}
                        className="glass-card p-3 rounded-lg border border-zinc-800 hover:border-amber-500/20 cursor-pointer shadow-md group transition"
                      >
                        <h4 className="text-xs font-bold text-zinc-200 group-hover:text-amber-500 truncate transition">
                          {lead.name}
                        </h4>
                        <div className="mt-2 space-y-1 text-[10px] text-zinc-500">
                          <p className="flex items-center gap-1.5">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate">{lead.city}</span>
                          </p>
                          <p className="flex items-center gap-1.5">
                            <Phone className="h-3 w-3 shrink-0" />
                            <span>{lead.phone}</span>
                          </p>
                          <p className="font-semibold text-zinc-400 mt-1">
                            {lead.load ? `${lead.load} kW` : "N/A"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --- TAB CONTENT: CLIENT DIRECTORY --- */}
      {activeTab === "customers" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Customers List */}
          <div className="glass-panel p-5 rounded-2xl border border-zinc-800 h-fit space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Customer Directory</h3>
            <div className="relative">
              <input
                type="text"
                placeholder="Search customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full glass-input rounded-lg py-2 pl-9 pr-3 text-xs text-white placeholder-zinc-500 focus:outline-none"
              />
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {getFilteredCustomers().map((cust: any) => (
                <div
                  key={cust.id}
                  onClick={() => setSelectedCustomer(cust)}
                  className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                    selectedCustomer?.id === cust.id
                      ? "bg-amber-500/10 border-amber-500 text-white"
                      : "bg-zinc-900/40 border-zinc-800 text-zinc-300 hover:bg-zinc-900/70"
                  }`}
                >
                  <div>
                    <h4 className="text-xs font-bold">{cust.name}</h4>
                    <p className="text-[10px] text-zinc-500 mt-0.5">{cust.city} • {cust.phone}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-zinc-600" />
                </div>
              ))}
            </div>
          </div>

          {/* Customer Profile Details */}
          <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-zinc-800">
            {selectedCustomer ? (
              <div className="space-y-6">
                {/* Profile Header */}
                <div className="border-b border-zinc-800 pb-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-white">{selectedCustomer.name}</h2>
                    <button
                      onClick={() => {
                        setEditCustomerName(selectedCustomer.name || "");
                        setEditCustomerPhone(selectedCustomer.phone || "");
                        setEditCustomerCnic(selectedCustomer.cnic || "");
                        setEditCustomerCity(selectedCustomer.city || "");
                        setEditCustomerEmail(selectedCustomer.email || "");
                        setShowEditCustomerModal(true);
                      }}
                      className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/25 rounded-lg text-[10px] font-bold transition cursor-pointer"
                    >
                      Edit Profile
                    </button>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">Registered Customer Profiles & Logs</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 text-xs">
                    <div>
                      <span className="text-zinc-500 block">Phone</span>
                      <strong className="text-zinc-200">{selectedCustomer.phone}</strong>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">CNIC</span>
                      <strong className="text-zinc-200">{selectedCustomer.cnic || "N/A"}</strong>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">City</span>
                      <strong className="text-zinc-200">{selectedCustomer.city}</strong>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">Email</span>
                      <strong className="text-zinc-200">{selectedCustomer.email || "N/A"}</strong>
                    </div>
                  </div>
                </div>

                {/* Projects workflow */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">Solar Projects</h4>
                  {selectedCustomer.projects?.length > 0 ? (
                    selectedCustomer.projects.map((proj: any) => (
                      <div key={proj.id} className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/80 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-zinc-200">{proj.name}</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => {
                                setEditingProject(proj);
                                setEditProjectName(proj.name || "");
                                setEditProjectStage(proj.stage || "Survey");
                                setEditProjectSurvey(proj.surveyDetails || "");
                                setEditProjectApproval(proj.approvalStatus || "");
                                setEditProjectMaterial(proj.materialOrdered || "");
                                setEditProjectInstallation(proj.installationDate || "");
                                setEditProjectInspection(proj.inspectionDate || "");
                                setEditProjectNetMetering(proj.netMeteringStatus || "");
                                setEditProjectWarranty(proj.warrantyYears?.toString() || "");
                                setEditProjectNotes(proj.notes || "");
                                setShowEditProjectModal(true);
                              }}
                              className="text-[9px] font-bold text-zinc-400 hover:text-amber-500 px-1 py-0.5 rounded cursor-pointer"
                            >
                              Edit
                            </button>
                            <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                              {proj.stage}
                            </span>
                          </div>
                        </div>
                        <p className="text-[11px] text-zinc-400">Survey details: {proj.surveyDetails || "Pending"}</p>
                        <p className="text-[11px] text-zinc-400">Net Metering: {proj.netMeteringStatus || "Not applied"}</p>
                        <p className="text-[11px] text-zinc-500 italic mt-2">Notes: {proj.notes || "None"}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-zinc-600">No active projects found.</p>
                  )}
                </div>

                {/* Tickets list */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">Support Tickets</h4>
                  {selectedCustomer.tickets?.length > 0 ? (
                    <div className="space-y-2">
                      {selectedCustomer.tickets.map((t: any) => (
                        <div key={t.id} className="flex justify-between items-center p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-xs">
                          <div>
                            <p className="font-bold text-zinc-200">{t.subject}</p>
                            <span className="text-[9px] text-zinc-500">{t.type}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setEditingTicket(t);
                                setEditTicketSubject(t.subject || "");
                                setEditTicketDescription(t.description || "");
                                setEditTicketType(t.type || "Complaint");
                                setEditTicketStatus(t.status || "Open");
                                setShowEditTicketModal(true);
                              }}
                              className="text-[10px] text-zinc-400 hover:text-amber-500 cursor-pointer font-semibold"
                            >
                              Edit
                            </button>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              t.status === "Open" ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            }`}>
                              {t.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-600">No support tickets reported.</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-center text-zinc-500">
                <div className="space-y-2">
                  <Users className="h-8 w-8 text-zinc-700 mx-auto" />
                  <p className="text-xs">Select a customer from the directory list to inspect profile summaries</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- TAB CONTENT: BRANDED QUOTATIONS GENERATOR --- */}
      {activeTab === "quotes" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Configure Box */}
          <div className="glass-panel p-6 rounded-2xl border border-zinc-800 space-y-4 h-fit">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <Sparkles className="h-4.5 w-4.5 text-amber-500" />
              <span>Configure Solar Quote</span>
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase">Client Name</label>
                <input
                  type="text"
                  value={quoteClient}
                  onChange={(e) => setQuoteClient(e.target.value)}
                  className="w-full block glass-input rounded-xl px-3 py-2 mt-1 text-xs text-white bg-zinc-900 focus:outline-none"
                  placeholder="Muhammad Usman"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase">Phone Number</label>
                <input
                  type="text"
                  value={quotePhone}
                  onChange={(e) => setQuotePhone(e.target.value)}
                  className="w-full block glass-input rounded-xl px-3 py-2 mt-1 text-xs text-white bg-zinc-900 focus:outline-none"
                  placeholder="0300-1234567"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase">Location City</label>
                <select
                  value={quoteLoc}
                  onChange={(e) => setQuoteLoc(e.target.value)}
                  className="w-full block glass-input rounded-xl px-3 py-2 mt-1 text-xs text-white bg-zinc-900 focus:outline-none"
                >
                  <option value="Islamabad">Islamabad</option>
                  <option value="Chakwal">Chakwal</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase">System Capacity (kW)</label>
                <input
                  type="number"
                  value={quoteSystemSize}
                  onChange={(e) => setQuoteSystemSize(e.target.value)}
                  className="w-full block glass-input rounded-xl px-3 py-2 mt-1 text-xs text-white bg-zinc-900 focus:outline-none"
                  placeholder="10"
                />
              </div>
            </div>

            {/* Select database items */}
            <div>
              <label className="text-[10px] font-bold text-zinc-500 uppercase">Select Solar Panel (Seeded Database)</label>
              <select
                value={selectedPanel?.id || ""}
                onChange={(e) => {
                  const p = data?.products?.find((x: any) => x.id === parseInt(e.target.value));
                  if (p) setSelectedPanel(p);
                }}
                className="w-full block glass-input rounded-xl px-3 py-2 mt-1 text-xs text-white bg-zinc-900 focus:outline-none"
              >
                {data?.products?.filter((p: any) => p.category === "Solar Panels").map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.brand} - PKR {p.rate}/unit)
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase">Panel Quantity</label>
                <input
                  type="number"
                  value={panelQty}
                  onChange={(e) => setPanelQty(parseInt(e.target.value) || 0)}
                  className="w-full block glass-input rounded-xl px-3 py-2 mt-1 text-xs text-white bg-zinc-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase">Select Inverter</label>
                <select
                  value={selectedInverter?.id || ""}
                  onChange={(e) => {
                    const p = data?.products?.find((x: any) => x.id === parseInt(e.target.value));
                    if (p) setSelectedInverter(p);
                  }}
                  className="w-full block glass-input rounded-xl px-3 py-2 mt-1 text-xs text-white bg-zinc-900 focus:outline-none"
                >
                  {data?.products?.filter((p: any) => p.category === "Inverters").map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (PKR {p.rate})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase">Select Battery (Optional)</label>
                <select
                  value={selectedBattery?.id || ""}
                  onChange={(e) => {
                    if (e.target.value === "") {
                      setSelectedBattery(null);
                    } else {
                      const p = data?.products?.find((x: any) => x.id === parseInt(e.target.value));
                      if (p) setSelectedBattery(p);
                    }
                  }}
                  className="w-full block glass-input rounded-xl px-3 py-2 mt-1 text-xs text-white bg-zinc-900 focus:outline-none"
                >
                  <option value="">No Batteries</option>
                  {data?.products?.filter((p: any) => p.category === "Batteries").map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (PKR {p.rate})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase">Battery Qty</label>
                <input
                  type="number"
                  disabled={!selectedBattery}
                  value={batteryQty}
                  onChange={(e) => setBatteryQty(parseInt(e.target.value) || 0)}
                  className="w-full block glass-input rounded-xl px-3 py-2 mt-1 text-xs text-white bg-zinc-900 focus:outline-none disabled:opacity-30"
                />
              </div>
            </div>

            <div className="flex gap-2.5 pt-3">
              <button
                onClick={calculateQuotation}
                className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Calculate Quotation
              </button>
            </div>
          </div>

          {/* Bill View */}
          <div className="glass-panel p-6 rounded-2xl border border-zinc-800 space-y-4">
            {quoteResult ? (
              <div id="printable-quotation" className="bg-white text-zinc-900 p-6 rounded-xl space-y-6 shadow-2xl relative">
                {/* Askari Logo Header */}
                <div className="flex justify-between items-start border-b border-zinc-200 pb-4">
                  <div>
                    <h2 className="text-base font-bold uppercase tracking-wider text-amber-600">
                      Askari Solar Energy
                    </h2>
                    <p className="text-[10px] text-zinc-500">Official Solar Invoicing & Quotation Breakdown</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-zinc-400 block">Date</span>
                    <span className="text-xs font-semibold">{new Date().toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Customer info */}
                <div className="grid grid-cols-2 gap-4 text-xs border-b border-zinc-150 pb-4">
                  <div>
                    <span className="text-zinc-400 block text-[9px] uppercase font-bold">Client Name</span>
                    <strong className="text-zinc-800">{quoteResult.clientName}</strong>
                  </div>
                  <div>
                    <span className="text-zinc-400 block text-[9px] uppercase font-bold">Client Location</span>
                    <strong className="text-zinc-800">{quoteResult.location}</strong>
                  </div>
                </div>

                {/* Items Table */}
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-200 text-zinc-400 font-bold">
                      <th className="py-2">Item Description</th>
                      <th className="py-2 text-center">Qty</th>
                      <th className="py-2 text-right">Rate</th>
                      <th className="py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quoteResult.items.map((item: any, idx: number) => (
                      <tr key={idx} className="border-b border-zinc-100 text-zinc-700">
                        <td className="py-2 font-medium">{item.name}</td>
                        <td className="py-2 text-center">{item.qty}</td>
                        <td className="py-2 text-right">
                          {new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", maximumFractionDigits: 0 }).format(item.rate)}
                        </td>
                        <td className="py-2 text-right font-semibold text-zinc-800">
                          {new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", maximumFractionDigits: 0 }).format(item.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Financial Summary */}
                <div className="flex flex-col items-end gap-1.5 text-xs border-t border-zinc-200 pt-4">
                  <div className="flex justify-between w-60 text-zinc-600">
                    <span>Subtotal:</span>
                    <span>{new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", maximumFractionDigits: 0 }).format(quoteResult.subtotal)}</span>
                  </div>
                  <div className="flex justify-between w-60 text-zinc-600">
                    <span>Sales Tax (17%):</span>
                    <span>{new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", maximumFractionDigits: 0 }).format(quoteResult.salesTax)}</span>
                  </div>
                  <div className="flex justify-between w-60 text-base font-bold text-zinc-900 border-t border-zinc-150 pt-2">
                    <span>Grand Total:</span>
                    <span>{new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", maximumFractionDigits: 0 }).format(quoteResult.grandTotal)}</span>
                  </div>
                </div>

                {/* Printing action */}
                <div className="absolute bottom-4 left-6 flex gap-2">
                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 text-white rounded-lg text-[10px] font-bold shadow-md hover:bg-zinc-800 cursor-pointer"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span>Print PDF</span>
                  </button>
                  <button
                    onClick={handleSaveQuotation}
                    disabled={actionLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-zinc-950 rounded-lg text-[10px] font-bold shadow-md hover:bg-amber-400 cursor-pointer"
                  >
                    <span>Save to Logs</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-96 flex items-center justify-center text-center text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
                <div className="space-y-2">
                  <FileText className="h-8 w-8 text-zinc-700 mx-auto" />
                  <p className="text-xs">Configure the specifications on the left and click Calculate to generate quotation breakups.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- TAB CONTENT: PRODUCT CATALOG --- */}
      {activeTab === "products" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Search catalog..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full glass-input rounded-lg py-2 pl-9 pr-3 text-xs text-white placeholder-zinc-500 focus:outline-none"
              />
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
            </div>
          </div>

          <div className="glass-panel rounded-xl border border-zinc-800 overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-zinc-300">
                <thead className="bg-zinc-900/50 text-zinc-400 border-b border-zinc-800 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4 font-bold">Category</th>
                    <th className="px-6 py-4 font-bold">Brand</th>
                    <th className="px-6 py-4 font-bold">Product Name</th>
                    <th className="px-6 py-4 font-bold">Tech Specs</th>
                    <th className="px-6 py-4 font-bold">Stock</th>
                    <th className="px-6 py-4 font-bold">Rate</th>
                    <th className="px-6 py-4 font-bold">Warranty</th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredProducts().length > 0 ? (
                    getFilteredProducts().map((prod: any) => (
                      <tr key={prod.id} className="border-b border-zinc-800/40 hover:bg-zinc-900/10">
                        <td className="px-6 py-4 text-amber-500 font-semibold">{prod.category}</td>
                        <td className="px-6 py-4 text-zinc-200">{prod.brand}</td>
                        <td className="px-6 py-4 font-bold text-zinc-200">{prod.name}</td>
                        <td className="px-6 py-4 text-zinc-400">{prod.spec || "--"}</td>
                        <td className="px-6 py-4 text-zinc-400">{prod.stock} units</td>
                        <td className="px-6 py-4 font-bold text-white">
                          {new Intl.NumberFormat("en-PK", {
                            style: "currency",
                            currency: "PKR",
                            maximumFractionDigits: 0,
                          }).format(prod.rate)}
                        </td>
                        <td className="px-6 py-4 text-zinc-400">{prod.warranty || "N/A"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-zinc-500">
                        No products found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB CONTENT: SUPPORT TICKETS --- */}
      {activeTab === "tickets" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Support Help Desk</h3>
            
            <button
              onClick={() => setShowCreateTicketModal(true)}
              className="flex items-center gap-1 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-lg text-xs transition cursor-pointer self-stretch sm:self-auto justify-center"
            >
              <Plus className="h-4 w-4" />
              <span>Log Support Ticket</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data?.tickets?.length > 0 ? (
              data.tickets.map((t: any) => (
                <div key={t.id} className="glass-panel p-5 rounded-2xl border border-zinc-800 space-y-4 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="bg-zinc-800 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase text-zinc-400">
                        {t.type}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold ${
                        t.status === "Open" ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      }`}>
                        {t.status}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-zinc-200">{t.subject}</h4>
                    <p className="text-xs text-zinc-400 leading-normal line-clamp-3">{t.description}</p>
                  </div>

                  <div className="border-t border-zinc-800/80 pt-3 flex items-center justify-between text-[10px] text-zinc-500">
                    <span>Client: <strong className="text-zinc-300">{t.customer?.name}</strong></span>
                    <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-zinc-600 col-span-full py-12 text-center">No service support tickets created.</p>
            )}
          </div>
        </div>
      )}

      {/* --- EMBEDDED CREATE LEAD DIALOG --- */}
      {showCreateLeadModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 animate-fade-in space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-amber-500" />
                <span>Capture Sales Lead</span>
              </h3>
              <button onClick={() => setShowCreateLeadModal(false)} className="text-zinc-500 hover:text-white cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase">Customer Name</label>
                  <input
                    type="text"
                    required
                    value={leadName}
                    onChange={(e) => setLeadName(e.target.value)}
                    className="w-full block glass-input rounded-xl px-3 py-2 mt-1.5 text-xs text-white bg-zinc-900 focus:outline-none"
                    placeholder="Muhammad Usman"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase">Phone Number</label>
                  <input
                    type="text"
                    required
                    value={leadPhone}
                    onChange={(e) => setLeadPhone(e.target.value)}
                    className="w-full block glass-input rounded-xl px-3 py-2 mt-1.5 text-xs text-white bg-zinc-900 focus:outline-none"
                    placeholder="0300-1234567"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase">CNIC</label>
                  <input
                    type="text"
                    value={leadCnic}
                    onChange={(e) => setLeadCnic(e.target.value)}
                    className="w-full block glass-input rounded-xl px-3 py-2 mt-1.5 text-xs text-white bg-zinc-900 focus:outline-none"
                    placeholder="35202-1234567-1"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase">City</label>
                  <input
                    type="text"
                    required
                    value={leadCity}
                    onChange={(e) => setLeadCity(e.target.value)}
                    className="w-full block glass-input rounded-xl px-3 py-2 mt-1.5 text-xs text-white bg-zinc-900 focus:outline-none"
                    placeholder="Islamabad"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase">Site Address</label>
                <input
                  type="text"
                  value={leadAddress}
                  onChange={(e) => setLeadAddress(e.target.value)}
                  className="w-full block glass-input rounded-xl px-3 py-2 mt-1.5 text-xs text-white bg-zinc-900 focus:outline-none"
                  placeholder="House 12, Phase 4A"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase">Electricity Bill</label>
                  <input
                    type="number"
                    value={leadBill}
                    onChange={(e) => setLeadBill(e.target.value)}
                    className="w-full block glass-input rounded-xl px-3 py-2 mt-1.5 text-xs text-white bg-zinc-900 focus:outline-none"
                    placeholder="45000"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase">Monthly Units</label>
                  <input
                    type="number"
                    value={leadUnits}
                    onChange={(e) => setLeadUnits(e.target.value)}
                    className="w-full block glass-input rounded-xl px-3 py-2 mt-1.5 text-xs text-white bg-zinc-900 focus:outline-none"
                    placeholder="350"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase">Load Capacity (kW)</label>
                  <input
                    type="text"
                    value={leadLoad}
                    onChange={(e) => setLeadLoad(e.target.value)}
                    className="w-full block glass-input rounded-xl px-3 py-2 mt-1.5 text-xs text-white bg-zinc-900 focus:outline-none"
                    placeholder="10.0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase">Lead Source</label>
                  <select
                    value={leadSource}
                    onChange={(e) => setLeadSource(e.target.value)}
                    className="w-full block glass-input rounded-xl px-3 py-2 text-xs text-white focus:outline-none bg-zinc-900 mt-1.5"
                  >
                    <option value="Campaign">Campaign</option>
                    <option value="Social">Social</option>
                    <option value="Direct">Direct</option>
                    <option value="Reference">Reference</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase">Campaign</label>
                  <input
                    type="text"
                    value={leadCampaign}
                    onChange={(e) => setLeadCampaign(e.target.value)}
                    className="w-full block glass-input rounded-xl px-3 py-2 mt-1.5 text-xs text-white bg-zinc-900 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase">Assign To (Sales Person)</label>
                <select
                  value={leadAssignedTo}
                  onChange={(e) => setLeadAssignedTo(e.target.value)}
                  className="w-full block glass-input rounded-xl px-3 py-2 text-xs text-white focus:outline-none bg-zinc-950 mt-1.5"
                >
                  <option value="">Select Sales Person</option>
                  {staffUsers.map((u: any) => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase">Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Customer interested in 10kW On-Grid solar"
                  value={leadNotes}
                  onChange={(e) => setLeadNotes(e.target.value)}
                  className="w-full block glass-input rounded-xl px-3 py-2 mt-1.5 text-xs text-white bg-zinc-900 focus:outline-none"
                />
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowCreateLeadModal(false)}
                  className="px-4 py-2 bg-zinc-850 text-zinc-400 text-xs font-semibold rounded-lg hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-lg text-xs"
                >
                  {actionLoading ? "Capturing..." : "Log Lead"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- LEAD DETAILS MODAL --- */}
      {selectedLead && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 animate-fade-in space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <h3 className="text-sm font-bold text-white">Lead Details: {selectedLead.name}</h3>
              <div className="flex items-center gap-2">
                {!isEditingLead && (
                  <button
                    onClick={() => setIsEditingLead(true)}
                    className="px-2 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-md text-[10px] font-bold hover:bg-amber-500/20 cursor-pointer"
                  >
                    Edit details
                  </button>
                )}
                <button onClick={() => setSelectedLead(null)} className="text-zinc-500 hover:text-white cursor-pointer">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {isEditingLead ? (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase">Lead Name</label>
                  <input
                    type="text"
                    value={editLeadName}
                    onChange={(e) => setEditLeadName(e.target.value)}
                    className="w-full block glass-input rounded-xl px-3 py-2 mt-1 text-xs text-white bg-zinc-950 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase">Phone</label>
                    <input
                      type="text"
                      value={editLeadPhone}
                      onChange={(e) => setEditLeadPhone(e.target.value)}
                      className="w-full block glass-input rounded-xl px-3 py-2 mt-1 text-xs text-white bg-zinc-950 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase">City</label>
                    <input
                      type="text"
                      value={editLeadCity}
                      onChange={(e) => setEditLeadCity(e.target.value)}
                      className="w-full block glass-input rounded-xl px-3 py-2 mt-1 text-xs text-white bg-zinc-950 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase">Site Address</label>
                  <input
                    type="text"
                    value={editLeadAddress}
                    onChange={(e) => setEditLeadAddress(e.target.value)}
                    className="w-full block glass-input rounded-xl px-3 py-2 mt-1 text-xs text-white bg-zinc-950 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase">Bill (PKR)</label>
                    <input
                      type="number"
                      value={editLeadBill}
                      onChange={(e) => setEditLeadBill(e.target.value)}
                      className="w-full block glass-input rounded-xl px-2 py-2 mt-1 text-xs text-white bg-zinc-950 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase">Units</label>
                    <input
                      type="number"
                      value={editLeadUnits}
                      onChange={(e) => setEditLeadUnits(e.target.value)}
                      className="w-full block glass-input rounded-xl px-2 py-2 mt-1 text-xs text-white bg-zinc-950 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase">Load (kW)</label>
                    <input
                      type="text"
                      value={editLeadLoad}
                      onChange={(e) => setEditLeadLoad(e.target.value)}
                      className="w-full block glass-input rounded-xl px-2 py-2 mt-1 text-xs text-white bg-zinc-950 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase">Notes / History</label>
                  <textarea
                    value={editLeadNotes}
                    onChange={(e) => setEditLeadNotes(e.target.value)}
                    rows={3}
                    className="w-full block glass-input rounded-xl px-3 py-2 mt-1 text-xs text-white bg-zinc-950 focus:outline-none"
                  />
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <button
                    onClick={() => setIsEditingLead(false)}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold rounded-xl text-xs transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveLeadEdit}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs transition cursor-pointer"
                  >
                    {actionLoading ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-zinc-500 block">Phone</span>
                    <strong className="text-zinc-200">{selectedLead.phone}</strong>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">City</span>
                    <strong className="text-zinc-200">{selectedLead.city}</strong>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-zinc-500 block">Site Address</span>
                    <strong className="text-zinc-200">{selectedLead.address || "N/A"}</strong>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Assigned Sales Person</span>
                    <strong className="text-zinc-200">{selectedLead.salesPerson?.name || "Unassigned"}</strong>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-zinc-900/60 p-3 rounded-lg border border-zinc-800">
                  <div>
                    <span className="text-zinc-500 text-[10px] block">Bill</span>
                    <strong className="text-zinc-200">PKR {selectedLead.electricityBill || "N/A"}</strong>
                  </div>
                  <div>
                    <span className="text-zinc-500 text-[10px] block">Units</span>
                    <strong className="text-zinc-200">{selectedLead.monthlyUnits || "N/A"}</strong>
                  </div>
                  <div>
                    <span className="text-zinc-500 text-[10px] block">Load</span>
                    <strong className="text-zinc-200">{selectedLead.load ? `${selectedLead.load} kW` : "N/A"}</strong>
                  </div>
                </div>

                <div>
                  <span className="text-zinc-500 block mb-1">Reassign Lead To</span>
                  <select
                    value={selectedLead.salesPersonId || ""}
                    onChange={(e) => handleReassignLead(selectedLead.id, e.target.value)}
                    disabled={actionLoading}
                    className="w-full block glass-input rounded-xl px-3 py-2 text-xs text-white focus:outline-none bg-zinc-950 font-sans"
                  >
                    <option value="">Unassigned</option>
                    {staffUsers.map((u: any) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <span className="text-zinc-500 block">Status History / Notes</span>
                  <p className="text-zinc-400 mt-1">{selectedLead.notes || "No notes logged."}</p>
                </div>
              </div>
            )}

              {/* Status transition actions */}
              <div className="border-t border-zinc-800 pt-4">
                <span className="block text-[10px] font-bold text-zinc-400 uppercase mb-2">Advance pipeline stage</span>
                <div className="flex flex-wrap gap-2">
                  {stages.map((st) => (
                    <button
                      key={st}
                      disabled={selectedLead.status === st || actionLoading}
                      onClick={() => handleUpdateLeadStatus(selectedLead.id, st)}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition uppercase cursor-pointer ${
                        selectedLead.status === st
                          ? "bg-amber-500 text-zinc-950"
                          : "bg-zinc-800 text-zinc-400 hover:text-white"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

      {/* --- CREATE SUPPORT TICKET DIALOG --- */}
      {showCreateTicketModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 animate-fade-in space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Wrench className="h-5 w-5 text-amber-500" />
                <span>Log Service Support Ticket</span>
              </h3>
              <button onClick={() => setShowCreateTicketModal(false)} className="text-zinc-500 hover:text-white cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase">Select Customer</label>
                <select
                  required
                  value={ticketCustId}
                  onChange={(e) => setTicketCustId(e.target.value)}
                  className="w-full block glass-input rounded-xl px-3 py-2 text-xs text-white focus:outline-none bg-zinc-900 mt-1.5"
                >
                  <option value="">Choose Customer...</option>
                  {data?.customers?.map((cust: any) => (
                    <option key={cust.id} value={cust.id}>
                      {cust.name} ({cust.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase">Ticket Type</label>
                <select
                  value={ticketType}
                  onChange={(e) => setTicketType(e.target.value)}
                  className="w-full block glass-input rounded-xl px-3 py-2 text-xs text-white focus:outline-none bg-zinc-900 mt-1.5"
                >
                  <option value="Complaint">Complaint</option>
                  <option value="Warranty Claim">Warranty Claim</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Service Visit">Service Visit</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase">Subject</label>
                <input
                  type="text"
                  required
                  value={ticketSubject}
                  onChange={(e) => setTicketSubject(e.target.value)}
                  className="w-full block glass-input rounded-xl px-3 py-2 mt-1.5 text-xs text-white bg-zinc-900 focus:outline-none"
                  placeholder="e.g. Inverter wifi syncing failure"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase">Detail Description</label>
                <textarea
                  required
                  rows={3}
                  value={ticketDesc}
                  onChange={(e) => setTicketDesc(e.target.value)}
                  className="w-full block glass-input rounded-xl px-3 py-2 mt-1.5 text-xs text-white bg-zinc-900 focus:outline-none"
                  placeholder="Describe the complaint or claim details..."
                />
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowCreateTicketModal(false)}
                  className="px-4 py-2 bg-zinc-850 text-zinc-400 text-xs font-semibold rounded-lg hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-lg text-xs"
                >
                  {actionLoading ? "Logging..." : "Create Ticket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- LEAD WIN PROOF UPLOAD MODAL --- */}
      {showWinModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 animate-fade-in space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CheckCircle className="h-4.5 w-4.5 text-amber-500" />
                <span>Upload Lead Agreement / Proof</span>
              </h3>
              <button onClick={() => { setShowWinModal(false); setLeadCompletionProof(""); }} className="text-zinc-500 hover:text-white cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-zinc-400 leading-normal font-sans">
              You are marking this lead as <strong>Won</strong>.
              A signed agreement, structural survey form, or downpayment receipt is required.
            </p>

            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Agreement / Proof File</label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    required
                    onChange={handleWinFileChange}
                    className="block w-full text-xs text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-zinc-800 file:text-zinc-300 hover:file:bg-zinc-700 file:cursor-pointer"
                  />
                </div>
                {uploadingWinFile && <p className="text-[10px] text-amber-500 animate-pulse">Uploading file...</p>}
                {winUploadError && <p className="text-[10px] text-red-400">{winUploadError}</p>}
                {leadCompletionProof && (
                  <p className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
                    <CheckCircle className="h-3 w-3" />
                    <span>File uploaded successfully!</span>
                  </p>
                )}
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => { setShowWinModal(false); setLeadCompletionProof(""); }}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs font-semibold rounded-lg hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={uploadingWinFile || !leadCompletionProof}
                  onClick={submitLeadCompletion}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-lg text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirm Lead Won
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
