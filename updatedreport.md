FEATURE: Accessibility Tools Builder + Reporting System
📌 Overview

Build a Tools Builder module with an Accessibility Audit Tool that allows auditors to:

Add, edit, and manage findings
Display findings in a table
Export findings into a structured AI-generated PDF report
🏗️ 1. MODULE STRUCTURE
Feature Name

AccessibilityAuditTool

Parent Module

ToolsBuilder

🧱 2. DATA MODEL
Entity: Finding
type Finding = {
  id: string;

  // Basic Info
  serviceName: string;
  issueTitle: string;
  issueDescription: string;

  // Classification
  severity: "High" | "Medium" | "Low";

  category: string;        // Main category
  subCategory: string;     // Subcategory

  // Media
  mediaUrl?: string;
  mediaType?: "image" | "video";
  mediaCaption?: string;

  // Additional
  pageUrl: string;
  recommendations: string;

  // Metadata
  createdAt: Date;
  createdBy: string;
  updatedAt?: Date;
};
Entity: Report
type Report = {
  id: string;
  projectId: string;

  title: string;
  clientName: string;
  clientLogoUrl?: string;

  createdBy: string;
  createdAt: Date;

  findings: Finding[];

  aiIntroduction?: string;
  aiStatistics?: string;
  aiRecommendationsSummary?: string;
};
🎛️ 3. UI COMPONENTS
3.1 Main Screen
Layout:
Header: "Accessibility Tool"
Button: Add New Finding
Table: Findings List
3.2 Findings Table
Columns:
Column	Notes
Service Name	
Issue Title	
Severity	Badge (color-coded)
Category	
Subcategory	
Page URL	Render as Click Here
Media	View button
Actions	Edit / Delete
3.3 Add / Edit Popup (Modal Form)
Sections:
🧾 Basic Info
Service Name (input or dropdown)
Issue Title (text input)
Issue Description (textarea)
⚠️ Classification
Severity (dropdown)
High
Medium
Low
🧩 Accessibility Category
Behavior:
First dropdown: Category
Second dropdown: Subcategory (dynamic based on category)
Categories Config (STATIC JSON)
const categories = {
  Images: [
    "Missing alt text",
    "Decorative images incorrectly announced",
    "Icons without labels",
    "CAPTCHA without alternatives",
    "Image-based buttons without description"
  ],
  Content: [
    "Missing or incorrect headings structure (H1–H6)",
    "Poor readability (complex language)",
    "Missing page titles",
    "Incorrect language declaration",
    "Abbreviations not explained"
  ],
  "Color & Contrast": [
    "Low text contrast",
    "Low contrast for UI components",
    "Reliance on color alone",
    "Placeholder text too light to read",
    "Disabled states not distinguishable"
  ],
  "Keyboard & Navigation": [
    "Not accessible via keyboard",
    "Missing focus indicator",
    "Incorrect tab order",
    "Keyboard traps",
    "Missing skip links",
    "Navigation inconsistency"
  ],
  "Forms & Inputs": [
    "Missing labels",
    "Placeholder instead of label",
    "Missing error messages",
    "Errors not explained",
    "Required fields not indicated",
    "No input instructions",
    "Incorrect associations"
  ],
  Multimedia: [
    "Missing captions",
    "Missing transcripts",
    "No audio descriptions",
    "Auto-play without control",
    "No pause/stop controls"
  ],
  "Touch & Mobile": [
    "Small tap targets",
    "Gesture-only interactions",
    "No gesture alternatives",
    "Elements too close",
    "No orientation support",
    "Motion without fallback"
  ],
  "Structure & Semantics": [
    "Missing ARIA roles",
    "Improper HTML structure",
    "Screen reader issues",
    "Inaccessible custom components",
    "Missing landmarks",
    "Duplicate IDs"
  ],
  "Timing & Interaction": [
    "Time limits without warning",
    "No extend option",
    "Auto-refresh",
    "Unstoppable animations",
    "Moving content without control"
  ],
  "Assistive Technology": [
    "Screen reader issues",
    "Voice control problems",
    "Zoom issues"
  ],
  "Authentication & Security": [
    "Cognitive complexity",
    "CAPTCHA barriers",
    "Memory-based challenges"
  ]
};
📎 Media Upload
File Upload (image/video)
Caption (optional)
🔗 Page URL
Text input
💡 Recommendations
Textarea
Actions
Save → create/update finding
Cancel → close modal
📊 4. REPORT GENERATION
Action

Button: Generate Report

Output: PDF (Landscape)
Requirements:
Orientation: Landscape
Each report belongs to a project
Multiple reports per project allowed
Report Structure
1. Cover Page
Client Logo
Client Name
Report Date
Auditor Name
2. Introduction (AI Generated)

Prompt input:

All findings

Output:

Summary of audit purpose and scope
3. Statistics (AI Generated)
Total issues
Issues per category
Severity breakdown
4. Issues Table

Columns:

Service Name
Issue Title
Severity
Category
Subcategory
Page URL → render as "Click Here" hyperlink
Media → "View Evidence"
Behavior:
Clicking media downloads embedded file (image/video)
Do NOT display raw URLs
5. Recommendations Summary (AI Generated)
Aggregate from all findings recommendations
Clean, deduplicated summary
6. End Cover Page
Branding / closing message
🤖 5. AI INTEGRATION
Required AI Functions
1. Generate Introduction

Input:

{ findings: Finding[] }
2. Generate Statistics

Return:

{
  totalIssues: number;
  byCategory: Record<string, number>;
  bySeverity: Record<string, number>;
}
3. Generate Recommendations Summary
Merge + deduplicate recommendations
✏️ 6. EDITING
Each finding is editable
Editing opens same popup (pre-filled)
Updates persist in DB
🧠 7. UX RULES
URL always displayed as: "Click Here"
Media displayed as:
"View Image"
"View Video"
Severity colors:
High → Red
Medium → Orange
Low → Green
🚀 8. OPTIONAL (Nice to Have)
Filters:
Severity
Category
Search bar
Bulk export
✅ FINAL NOTE (IMPORTANT FOR AI IMPLEMENTATION)
Keep categories as static config
Keep AI only for summaries, not core logic
Do NOT generate rules dynamically
Ensure clean separation: UI / Data / AI






gemini canvas version sample  should apply arabic/english to it 
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  FileText, 
  Trash2, 
  Edit2, 
  Download, 
  ExternalLink, 
  Image as ImageIcon, 
  Video, 
  ChevronRight, 
  ArrowLeft,
  Layout,
  AlertCircle,
  CheckCircle2,
  Info,
  Loader2,
  User,
  Calendar,
  Layers,
  BarChart3,
  FolderOpen,
  Search,
  Filter,
  MoreVertical
} from 'lucide-react';

// --- Constants & Data Structures ---

const SEVERITY_LEVELS = {
  High: { color: 'text-red-600 bg-red-50 border-red-200', icon: AlertCircle },
  Medium: { color: 'text-orange-600 bg-orange-50 border-orange-200', icon: Info },
  Low: { color: 'text-green-600 bg-green-50 border-green-200', icon: CheckCircle2 },
};

const CATEGORIES_CONFIG = {
  "Images": [
    "Missing alt text", "Decorative images incorrectly announced", "Icons without labels", 
    "CAPTCHA without alternatives", "Image-based buttons without description"
  ],
  "Content": [
    "Missing or incorrect headings structure (H1–H6)", "Poor readability (complex language)", 
    "Missing page titles", "Incorrect language declaration", "Abbreviations not explained"
  ],
  "Color & Contrast": [
    "Low text contrast", "Low contrast for UI components", "Reliance on color alone", 
    "Placeholder text too light to read", "Disabled states not distinguishable"
  ],
  "Keyboard & Navigation": [
    "Not accessible via keyboard", "Missing focus indicator", "Incorrect tab order", 
    "Keyboard traps", "Missing skip links", "Navigation inconsistency"
  ],
  "Forms & Inputs": [
    "Missing labels", "Placeholder instead of label", "Missing error messages", 
    "Errors not explained", "Required fields not indicated", "No input instructions", 
    "Incorrect associations"
  ],
  "Multimedia": [
    "Missing captions", "Missing transcripts", "No audio descriptions", 
    "Auto-play without control", "No pause/stop controls"
  ],
  "Touch & Mobile": [
    "Small tap targets", "Gesture-only interactions", "No gesture alternatives", 
    "Elements too close", "No orientation support", "Motion without fallback"
  ],
  "Structure & Semantics": [
    "Missing ARIA roles", "Improper HTML structure", "Screen reader issues", 
    "Inaccessible custom components", "Missing landmarks", "Duplicate IDs"
  ],
  "Timing & Interaction": [
    "Time limits without warning", "No extend option", "Auto-refresh", 
    "Unstoppable animations", "Moving content without control"
  ],
  "Assistive Technology": [
    "Screen reader issues", "Voice control problems", "Zoom issues"
  ],
  "Authentication & Security": [
    "Cognitive complexity", "CAPTCHA barriers", "Memory-based challenges"
  ]
};

// --- AI Integration Functions ---

const apiKey = ""; // Provided at runtime
const generateAIContent = async (prompt, systemPrompt) => {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] }
      })
    });
    const result = await response.json();
    return result.candidates?.[0]?.content?.parts?.[0]?.text || "AI Generation failed.";
  } catch (error) {
    console.error("AI Error:", error);
    return "Error generating AI content.";
  }
};

// --- Shared Components ---

const Modal = ({ isOpen, onClose, children, title }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
          <h3 className="text-xl font-bold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-transform hover:rotate-90">
            <Plus className="rotate-45 w-6 h-6" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 bg-white">
          {children}
        </div>
      </div>
    </div>
  );
};

const ReportPreview = ({ report, findings, onBack, auditorName }) => {
  const [aiContent, setAiContent] = useState({ intro: '', stats: '', recs: '', loading: true });

  useEffect(() => {
    const fetchAI = async () => {
      const summaryData = findings.map(f => ({
        issueTitle: f.issueTitle,
        severity: f.severity,
        category: f.category,
        recommendations: f.recommendations
      }));

      const dataStr = JSON.stringify(summaryData);
      
      const introPrompt = `Generate a professional accessibility audit introduction for client "${report.clientName}". Purpose: summarize audit scope based on these findings: ${dataStr}`;
      const statsPrompt = `Analyze these findings and return a structured statistical summary: total issue count, issue counts per severity, and counts per category. Data: ${dataStr}`;
      const recsPrompt = `Deduplicate and summarize high-level strategic recommendations for the dev team based on these individual recommendations: ${dataStr}`;

      const [intro, stats, recs] = await Promise.all([
        generateAIContent(introPrompt, "You are a senior accessibility consultant. Provide a professional summary."),
        generateAIContent(statsPrompt, "You are a data analyst. Break down the counts clearly by severity and category."),
        generateAIContent(recsPrompt, "You are a technical lead. Aggregate and deduplicate the path forward.")
      ]);

      setAiContent({ intro, stats, recs, loading: false });
    };

    if (findings.length > 0) fetchAI();
    else setAiContent(prev => ({ ...prev, loading: false }));
  }, [findings, report.clientName]);

  return (
    <div className="fixed inset-0 z-[60] bg-gray-100 overflow-y-auto print:bg-white">
      <div className="max-w-[1400px] mx-auto py-12 px-8 print:p-0">
        <div className="flex justify-between items-center mb-8 print:hidden">
          <button onClick={onBack} className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-bold px-4 py-2 bg-white rounded-lg shadow-sm border">
            <ArrowLeft className="w-4 h-4" /> Exit Preview
          </button>
          <button 
            onClick={() => window.print()} 
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-lg"
          >
            <Download className="w-4 h-4" /> Download Landscape PDF
          </button>
        </div>

        {/* Cover Page */}
        <div className="bg-white aspect-[1.414/1] shadow-xl mb-12 flex flex-col items-center justify-center text-center p-20 rounded-lg relative overflow-hidden print:shadow-none print:border print:mb-0 print:page-break-after-always">
          <div className="absolute top-0 left-0 w-full h-4 bg-blue-600"></div>
          <div className="w-40 h-40 bg-gray-50 rounded-3xl flex items-center justify-center mb-10 border-4 border-dashed border-gray-200">
             <span className="text-gray-400 font-bold uppercase tracking-widest text-sm">Client Logo</span>
          </div>
          <h1 className="text-6xl font-black text-gray-900 mb-6">{report.clientName}</h1>
          <h2 className="text-3xl text-blue-600 font-bold mb-16 tracking-[0.3em] uppercase">Accessibility Audit Report</h2>
          <div className="mt-auto border-t pt-12 w-full max-w-3xl flex justify-between items-end text-gray-500">
            <div className="text-left">
              <p className="text-xs uppercase tracking-[0.2em] font-black text-gray-400 mb-2">Lead Auditor</p>
              <p className="text-xl font-bold text-gray-800">{auditorName}</p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-[0.2em] font-black text-gray-400 mb-2">Audit Date</p>
              <p className="text-xl font-bold text-gray-800">{new Date(report.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {/* AI Intro & Stats */}
        <div className="bg-white aspect-[1.414/1] shadow-xl mb-12 p-16 rounded-lg flex flex-col print:shadow-none print:border print:page-break-after-always">
          <h3 className="text-4xl font-black mb-12 text-gray-900 border-b-4 border-blue-600 inline-block pb-2">Executive Overview</h3>
          {aiContent.loading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-6">
              <Loader2 className="w-16 h-16 animate-spin text-blue-600" />
              <p className="font-bold text-gray-400 text-lg">Gemini AI is analyzing audit results...</p>
            </div>
          ) : (
            <div className="grid grid-cols-12 gap-16 flex-1">
              <div className="col-span-7">
                <h4 className="text-2xl font-bold text-blue-700 mb-6 flex items-center gap-3">
                  <FileText className="w-7 h-7" /> Audit Scope & Purpose
                </h4>
                <div className="text-gray-600 text-lg leading-relaxed whitespace-pre-wrap">{aiContent.intro}</div>
              </div>
              <div className="col-span-5 flex flex-col gap-8">
                <div className="bg-blue-50/50 p-8 rounded-3xl border-2 border-blue-100 flex-1">
                  <h4 className="text-xl font-black text-blue-800 mb-6 flex items-center gap-3 uppercase tracking-wider">
                    <BarChart3 className="w-6 h-6" /> Data Breakdown
                  </h4>
                  <div className="text-gray-700 whitespace-pre-wrap prose-lg font-medium">{aiContent.stats}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Issues Table - Landscape Layout */}
        <div className="bg-white shadow-xl mb-12 p-12 rounded-lg min-h-[800px] print:shadow-none print:border print:page-break-after-always">
          <h3 className="text-4xl font-black mb-12 text-gray-900 border-b-4 border-blue-600 inline-block pb-2">Technical Findings</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse table-fixed">
              <thead className="bg-gray-900 text-white text-[10px] uppercase tracking-[0.2em] font-black">
                <tr>
                  <th className="p-4 border border-gray-800 w-12">#</th>
                  <th className="p-4 border border-gray-800 w-1/4">Service & Issue</th>
                  <th className="p-4 border border-gray-800 w-24 text-center">Severity</th>
                  <th className="p-4 border border-gray-800 w-1/4">Classification</th>
                  <th className="p-4 border border-gray-800 w-32">Location</th>
                  <th className="p-4 border border-gray-800 w-32">Evidence</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {findings.map((f, idx) => (
                  <tr key={f.id} className="border-b even:bg-gray-50/50">
                    <td className="p-4 border align-top font-black text-gray-300">{idx + 1}</td>
                    <td className="p-4 border align-top">
                      <div className="font-black text-gray-900 mb-2 uppercase text-xs">{f.serviceName}</div>
                      <div className="font-bold text-blue-700 mb-2">{f.issueTitle}</div>
                      <div className="text-gray-500 text-xs leading-relaxed">{f.issueDescription}</div>
                    </td>
                    <td className="p-4 border align-top text-center">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${SEVERITY_LEVELS[f.severity]?.color}`}>
                        {f.severity}
                      </span>
                    </td>
                    <td className="p-4 border align-top">
                      <div className="font-bold text-gray-800 text-xs mb-1">{f.category}</div>
                      <div className="text-gray-400 text-[10px] italic">{f.subCategory}</div>
                    </td>
                    <td className="p-4 border align-top">
                      <a href={f.pageUrl} className="text-blue-600 font-bold flex items-center gap-1 hover:underline text-xs">
                        Click Here <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                    <td className="p-4 border align-top">
                      {f.mediaType ? (
                        <div className="flex flex-col gap-2">
                          <button className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg font-bold text-gray-700 text-[10px] uppercase hover:bg-gray-200 transition-colors border shadow-sm">
                            {f.mediaType === 'image' ? <ImageIcon className="w-3 h-3" /> : <Video className="w-3 h-3" />}
                            View Evidence
                          </button>
                          {f.mediaCaption && <p className="text-[10px] text-gray-400 italic">"{f.mediaCaption}"</p>}
                        </div>
                      ) : <span className="text-gray-300 italic text-[10px]">No Evidence</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* AI Summary Recommendations */}
        <div className="bg-white aspect-[1.414/1] shadow-xl mb-12 p-16 rounded-lg flex flex-col print:shadow-none print:border print:page-break-after-always">
          <h3 className="text-4xl font-black mb-12 text-gray-900 border-b-4 border-blue-600 inline-block pb-2">Strategic Roadmap</h3>
          {aiContent.loading ? (
             <div className="flex-1 flex flex-col items-center justify-center">
               <Loader2 className="w-16 h-16 animate-spin text-blue-600" />
             </div>
          ) : (
            <div className="prose prose-xl max-w-none text-gray-700 font-medium leading-relaxed">
              <p className="whitespace-pre-wrap">{aiContent.recs}</p>
            </div>
          )}
        </div>

        {/* End Cover */}
        <div className="bg-gray-950 aspect-[1.414/1] shadow-xl p-20 rounded-lg flex flex-col items-center justify-center text-white text-center print:shadow-none">
          <div className="w-32 h-4 bg-blue-600 mb-12 rounded-full"></div>
          <h2 className="text-5xl font-black mb-6">Partners in Accessibility</h2>
          <p className="text-gray-400 text-xl max-w-2xl mx-auto leading-relaxed">
            Ensuring digital equality is an ongoing journey. We thank you for your commitment to building inclusive experiences.
          </p>
          <div className="mt-32 border-t border-gray-800 pt-12 w-full max-w-lg">
            <p className="text-sm tracking-[0.4em] text-blue-500 uppercase font-black italic">Confidential Audit End</p>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page {
            size: landscape;
            margin: 0;
          }
          body {
            margin: 0;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
};

export default function App() {
  // Spec-compliant State
  const [projects, setProjects] = useState([
    { id: 'p1', name: 'Internal QA Project' }
  ]);
  const [activeProjectId, setActiveProjectId] = useState('p1');
  
  const [reports, setReports] = useState([
    { id: 'r1', projectId: 'p1', clientName: 'Default Client', title: 'Q1 Accessibility Scan', createdAt: new Date().toISOString(), createdBy: 'Lead Auditor' }
  ]);
  const [activeReportId, setActiveReportId] = useState('r1');
  
  const [findings, setFindings] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFinding, setEditingFinding] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [auditorName, setAuditorName] = useState("Jane Auditor");

  // Form State matching the spec Finding type
  const [form, setForm] = useState({
    serviceName: '',
    issueTitle: '',
    issueDescription: '',
    severity: 'Medium',
    category: '',
    subCategory: '',
    pageUrl: '',
    recommendations: '',
    mediaType: null,
    mediaCaption: '',
    mediaUrl: ''
  });

  const activeProject = projects.find(p => p.id === activeProjectId);
  const projectReports = reports.filter(r => r.projectId === activeProjectId);
  const activeReport = reports.find(r => r.id === activeReportId);
  const reportFindings = findings.filter(f => f.reportId === activeReportId);

  const handleSaveFinding = (e) => {
    e.preventDefault();
    const now = new Date();
    if (editingFinding) {
      setFindings(findings.map(f => f.id === editingFinding.id ? { 
        ...form, 
        id: f.id, 
        reportId: activeReportId,
        updatedAt: now 
      } : f));
    } else {
      setFindings([...findings, { 
        ...form, 
        id: `f-${Date.now()}`, 
        reportId: activeReportId,
        createdAt: now,
        createdBy: auditorName
      }]);
    }
    resetForm();
    setIsModalOpen(false);
  };

  const resetForm = () => {
    setForm({
      serviceName: '',
      issueTitle: '',
      issueDescription: '',
      severity: 'Medium',
      category: '',
      subCategory: '',
      pageUrl: '',
      recommendations: '',
      mediaType: null,
      mediaCaption: '',
      mediaUrl: ''
    });
    setEditingFinding(null);
  };

  const openEdit = (finding) => {
    setEditingFinding(finding);
    setForm(finding);
    setIsModalOpen(true);
  };

  const deleteFinding = (id) => {
    setFindings(findings.filter(f => f.id !== id));
  };

  const createProject = () => {
    const name = prompt("New Project Name:");
    if (name) {
      const id = `p-${Date.now()}`;
      setProjects([...projects, { id, name }]);
      setActiveProjectId(id);
    }
  };

  const createReport = () => {
    const clientName = prompt("Client Name:");
    if (clientName) {
      const id = `r-${Date.now()}`;
      const newReport = { 
        id, 
        projectId: activeProjectId, 
        clientName, 
        title: `${clientName} Audit`, 
        createdAt: new Date().toISOString(), 
        createdBy: auditorName 
      };
      setReports([...reports, newReport]);
      setActiveReportId(id);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans">
      {/* Project & Report Sidebar */}
      <div className="w-80 bg-gray-900 border-r border-gray-800 flex flex-col shrink-0">
        <div className="p-8 border-b border-gray-800 bg-blue-600">
          <h1 className="text-xl font-black text-white tracking-tighter flex items-center gap-3">
            <Layout className="w-7 h-7" /> TOOLS BUILDER
          </h1>
          <p className="text-[10px] text-blue-100 font-black tracking-[0.2em] uppercase mt-2">Accessibility Audit Tool</p>
        </div>
        
        <div className="p-6 flex-1 overflow-y-auto space-y-8">
          {/* Project Selector */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Active Projects</h2>
              <button onClick={createProject} className="p-1.5 hover:bg-gray-800 rounded-lg text-blue-400 transition-colors">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <select 
              value={activeProjectId}
              onChange={(e) => setActiveProjectId(e.target.value)}
              className="w-full bg-gray-800 text-gray-200 border border-gray-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          {/* Report List */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Reports for Project</h2>
              <button onClick={createReport} className="p-1.5 hover:bg-gray-800 rounded-lg text-green-400 transition-colors">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              {projectReports.map(r => (
                <button
                  key={r.id}
                  onClick={() => setActiveReportId(r.id)}
                  className={`w-full text-left px-4 py-3.5 rounded-xl flex items-center gap-3 transition-all ${
                    activeReportId === r.id 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                    : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                  }`}
                >
                  <FileText className={`w-5 h-5 ${activeReportId === r.id ? 'text-blue-100' : 'text-gray-600'}`} />
                  <div className="flex-1 overflow-hidden">
                    <p className="font-bold truncate text-sm">{r.clientName}</p>
                    <p className={`text-[10px] ${activeReportId === r.id ? 'text-blue-200' : 'text-gray-500'}`}>
                      {new Date(r.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </button>
              ))}
              {projectReports.length === 0 && (
                <div className="p-8 text-center border-2 border-dashed border-gray-800 rounded-2xl">
                  <p className="text-gray-600 text-xs italic">No reports in this project.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* User Status */}
        <div className="p-6 border-t border-gray-800 bg-gray-950/50">
           <div className="flex items-center gap-4 bg-gray-800/50 p-3 rounded-2xl border border-gray-800">
              <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-600/30 flex items-center justify-center text-blue-500">
                <User className="w-6 h-6" />
              </div>
              <div className="flex-1 overflow-hidden">
                <input 
                  type="text" 
                  value={auditorName} 
                  onChange={(e) => setAuditorName(e.target.value)}
                  className="bg-transparent text-sm font-black text-white w-full focus:outline-none placeholder-gray-600"
                  placeholder="Your Name"
                />
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Senior Auditor</p>
              </div>
           </div>
        </div>
      </div>

      {/* Main Builder Interface */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Contextual Header */}
        <header className="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-10 shrink-0">
          <div className="flex flex-col">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">{activeReport?.clientName || "Accessibility Audit"}</h2>
            <div className="flex items-center gap-4 text-xs font-bold text-gray-400 uppercase tracking-widest">
              <span className="flex items-center gap-1.5"><FolderOpen className="w-3.5 h-3.5" /> {activeProject?.name}</span>
              <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
              <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {new Date(activeReport?.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={() => setIsPreviewOpen(true)}
              disabled={reportFindings.length === 0}
              className="flex items-center gap-2 px-6 py-3 text-gray-600 hover:bg-gray-100 rounded-xl transition-all font-bold border-2 border-transparent hover:border-gray-200 disabled:opacity-40"
            >
              <Download className="w-5 h-5" /> Generate PDF Report
            </button>
            <button 
              onClick={() => { resetForm(); setIsModalOpen(true); }}
              className="flex items-center gap-3 px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-black shadow-xl shadow-blue-200"
            >
              <Plus className="w-5 h-5" /> Add New Finding
            </button>
          </div>
        </header>

        {/* Audit Table Content */}
        <main className="flex-1 overflow-y-auto p-10 bg-gray-50/50">
          {reportFindings.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
              <div className="w-24 h-24 bg-white border-4 border-dashed border-gray-200 rounded-[2rem] flex items-center justify-center text-gray-200 mb-8 transform -rotate-6">
                <FileText className="w-12 h-12" />
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-3">No findings documented yet</h3>
              <p className="text-gray-500 font-medium leading-relaxed mb-10 text-sm">Every high-quality audit begins with the first observation. Add a finding to start building your compliance report.</p>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="px-10 py-4 bg-white border-2 border-blue-600 text-blue-600 rounded-2xl font-black hover:bg-blue-50 transition-all shadow-sm"
              >
                Launch Audit Entry
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-[2rem] border border-gray-200 shadow-xl shadow-gray-200/40 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-900 text-[10px] text-gray-400 uppercase tracking-[0.25em] font-black">
                    <th className="px-8 py-6 w-20">Ref</th>
                    <th className="px-8 py-6">Service & Issue Title</th>
                    <th className="px-8 py-6 w-32">Severity</th>
                    <th className="px-8 py-6 w-1/4">Categorization</th>
                    <th className="px-8 py-6 w-32">Evidence</th>
                    <th className="px-8 py-6 w-24 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {reportFindings.map((f, idx) => {
                    const SeverityIcon = SEVERITY_LEVELS[f.severity]?.icon || AlertCircle;
                    return (
                      <tr key={f.id} className="hover:bg-blue-50/30 transition-colors group">
                        <td className="px-8 py-7 align-top font-black text-gray-200 text-lg">{(idx + 1).toString().padStart(2, '0')}</td>
                        <td className="px-8 py-7 align-top">
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{f.serviceName}</span>
                            <span className="text-lg font-bold text-gray-900 leading-tight group-hover:text-blue-700 transition-colors">{f.issueTitle}</span>
                            <p className="text-xs text-gray-500 line-clamp-2 mt-2 font-medium leading-relaxed">{f.issueDescription}</p>
                            <div className="mt-4">
                              <a href={f.pageUrl} className="inline-flex items-center gap-1.5 text-[10px] font-black text-blue-600 hover:text-blue-800 uppercase tracking-tighter">
                                Click Here <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-7 align-top">
                          <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase border-2 shadow-sm ${SEVERITY_LEVELS[f.severity]?.color}`}>
                            <SeverityIcon className="w-3.5 h-3.5" />
                            {f.severity}
                          </span>
                        </td>
                        <td className="px-8 py-7 align-top">
                          <div className="flex flex-col gap-1">
                            <span className="text-sm font-black text-gray-800">{f.category}</span>
                            <span className="text-xs font-bold text-gray-400 italic">{f.subCategory}</span>
                          </div>
                        </td>
                        <td className="px-8 py-7 align-top">
                           {f.mediaType ? (
                             <div className="flex flex-col gap-1.5">
                               <button className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-all shadow-sm">
                                 {f.mediaType === 'image' ? <ImageIcon className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                                 <span className="text-[10px] font-black uppercase tracking-tighter">View Evidence</span>
                               </button>
                               {f.mediaCaption && <p className="text-[10px] text-gray-400 truncate w-32">"{f.mediaCaption}"</p>}
                             </div>
                           ) : <span className="text-gray-300 italic text-xs">No media</span>}
                        </td>
                        <td className="px-8 py-7 align-top text-right">
                          <div className="flex justify-end items-center gap-2">
                            <button onClick={() => openEdit(f)} className="p-3 text-gray-400 hover:text-blue-600 hover:bg-white hover:shadow-lg rounded-xl transition-all border border-transparent hover:border-blue-100">
                              <Edit2 className="w-5 h-5" />
                            </button>
                            <button onClick={() => deleteFinding(f.id)} className="p-3 text-gray-400 hover:text-red-600 hover:bg-white hover:shadow-lg rounded-xl transition-all border border-transparent hover:border-red-100">
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </main>

        {/* Footer Statistics */}
        <footer className="h-16 bg-white border-t border-gray-200 flex items-center justify-between px-10 text-[10px] text-gray-500 font-black uppercase tracking-[0.2em]">
           <div className="flex items-center gap-6">
             <span className="text-gray-300">Analysis Summary</span>
             <div className="flex gap-4">
               <span className="flex items-center gap-2 text-red-600"><div className="w-2.5 h-2.5 rounded-full bg-red-600 shadow-lg shadow-red-200"></div> {reportFindings.filter(f => f.severity === 'High').length} High</span>
               <span className="flex items-center gap-2 text-orange-600"><div className="w-2.5 h-2.5 rounded-full bg-orange-600 shadow-lg shadow-orange-200"></div> {reportFindings.filter(f => f.severity === 'Medium').length} Medium</span>
               <span className="flex items-center gap-2 text-green-600"><div className="w-2.5 h-2.5 rounded-full bg-green-600 shadow-lg shadow-green-200"></div> {reportFindings.filter(f => f.severity === 'Low').length} Low</span>
             </div>
           </div>
           <div className="flex items-center gap-2">
             <span className="px-4 py-1.5 bg-gray-100 rounded-full">{reportFindings.length} Active Findings</span>
           </div>
        </footer>
      </div>

      {/* Audit Form Popup - Matching the Spec Section by Section */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingFinding ? "Modify Audit Entry" : "New Accessibility Observation"}
      >
        <form onSubmit={handleSaveFinding} className="space-y-10 pb-10">
          {/* 🧾 Basic Info Section */}
          <section>
            <div className="flex items-center gap-3 text-blue-600 mb-6 border-l-4 border-blue-600 pl-4">
              <Layers className="w-6 h-6" />
              <h4 className="text-xs font-black uppercase tracking-[0.3em]">Basic Information</h4>
            </div>
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 tracking-widest">Service Name / Module</label>
                <input 
                  type="text" required
                  value={form.serviceName}
                  onChange={(e) => setForm({...form, serviceName: e.target.value})}
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-bold text-gray-800"
                  placeholder="e.g., Mobile Checkout Flow"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 tracking-widest">Issue Title</label>
                  <input 
                    type="text" required
                    value={form.issueTitle}
                    onChange={(e) => setForm({...form, issueTitle: e.target.value})}
                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-bold text-gray-800"
                    placeholder="Short descriptive summary of the problem"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 tracking-widest">Issue Description</label>
                <textarea 
                  rows="4" required
                  value={form.issueDescription}
                  onChange={(e) => setForm({...form, issueDescription: e.target.value})}
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all resize-none font-medium text-gray-700 leading-relaxed"
                  placeholder="Detailed breakdown of the accessibility barrier..."
                />
              </div>
            </div>
          </section>

          {/* ⚠️ Classification Section */}
          <section>
            <div className="flex items-center gap-3 text-orange-600 mb-6 border-l-4 border-orange-600 pl-4">
              <AlertCircle className="w-6 h-6" />
              <h4 className="text-xs font-black uppercase tracking-[0.3em]">Severity Classification</h4>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {['High', 'Medium', 'Low'].map(lvl => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setForm({...form, severity: lvl})}
                  className={`relative py-4 rounded-2xl border-2 font-black transition-all overflow-hidden ${
                    form.severity === lvl 
                      ? 'border-blue-600 bg-blue-50 text-blue-800 shadow-xl shadow-blue-100 scale-105 z-10' 
                      : 'border-gray-100 text-gray-400 hover:border-gray-200 grayscale'
                  }`}
                >
                  <span className="relative z-10 uppercase text-xs tracking-widest">{lvl}</span>
                  {form.severity === lvl && <div className="absolute inset-0 bg-blue-100/50 animate-pulse"></div>}
                </button>
              ))}
            </div>
          </section>

          {/* 🧩 Category Section */}
          <section>
            <div className="flex items-center gap-3 text-purple-600 mb-6 border-l-4 border-purple-600 pl-4">
              <CheckCircle2 className="w-6 h-6" />
              <h4 className="text-xs font-black uppercase tracking-[0.3em]">Accessibility Category</h4>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 tracking-widest">Main Category</label>
                <select 
                  required
                  value={form.category}
                  onChange={(e) => setForm({...form, category: e.target.value, subCategory: ''})}
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-purple-100 outline-none font-bold text-gray-800"
                >
                  <option value="">Select Category</option>
                  {Object.keys(CATEGORIES_CONFIG).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              {form.category && (
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 tracking-widest">Subcategory</label>
                  <select 
                    required
                    value={form.subCategory}
                    onChange={(e) => setForm({...form, subCategory: e.target.value})}
                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-purple-100 outline-none font-bold text-gray-800"
                  >
                    <option value="">Select Sub-Category</option>
                    {CATEGORIES_CONFIG[form.category].map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </section>

          {/* 📎 Media Upload Section */}
          <section>
            <div className="flex items-center gap-3 text-green-600 mb-6 border-l-4 border-green-600 pl-4">
              <ImageIcon className="w-6 h-6" />
              <h4 className="text-xs font-black uppercase tracking-[0.3em]">Evidence Media</h4>
            </div>
            <div className="space-y-6">
              <div className="flex gap-4">
                <button 
                  type="button" 
                  onClick={() => setForm({...form, mediaType: 'image'})}
                  className={`flex-1 flex items-center justify-center gap-3 py-4 border-2 rounded-2xl transition-all font-black uppercase text-xs tracking-tighter ${form.mediaType === 'image' ? 'bg-green-50 border-green-500 text-green-800 shadow-lg shadow-green-100' : 'bg-gray-50 border-gray-100 text-gray-400'}`}
                >
                  <ImageIcon className="w-5 h-5" /> Image Proof
                </button>
                <button 
                  type="button" 
                  onClick={() => setForm({...form, mediaType: 'video'})}
                  className={`flex-1 flex items-center justify-center gap-3 py-4 border-2 rounded-2xl transition-all font-black uppercase text-xs tracking-tighter ${form.mediaType === 'video' ? 'bg-green-50 border-green-500 text-green-800 shadow-lg shadow-green-100' : 'bg-gray-50 border-gray-100 text-gray-400'}`}
                >
                  <Video className="w-5 h-5" /> Video Demo
                </button>
                {form.mediaType && (
                  <button 
                    type="button" 
                    onClick={() => setForm({...form, mediaType: null})}
                    className="px-4 py-4 bg-red-50 text-red-500 border-2 border-red-100 rounded-2xl hover:bg-red-100 transition-all"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
              {form.mediaType && (
                <div className="animate-in fade-in slide-in-from-top-2">
                  <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 tracking-widest">Media Caption / Note</label>
                  <input 
                    type="text"
                    value={form.mediaCaption}
                    onChange={(e) => setForm({...form, mediaCaption: e.target.value})}
                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-green-100 outline-none font-bold"
                    placeholder="Briefly describe what this evidence proves..."
                  />
                </div>
              )}
            </div>
          </section>

          {/* 🔗 Location & 💡 Recommendation Sections */}
          <section className="grid grid-cols-1 gap-10">
            <div>
              <div className="flex items-center gap-3 text-cyan-600 mb-6 border-l-4 border-cyan-600 pl-4">
                <ExternalLink className="w-6 h-6" />
                <h4 className="text-xs font-black uppercase tracking-[0.3em]">Digital Location</h4>
              </div>
              <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 tracking-widest">Exact Page URL</label>
              <input 
                type="url" required
                value={form.pageUrl}
                onChange={(e) => setForm({...form, pageUrl: e.target.value})}
                className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-cyan-100 outline-none font-bold text-cyan-700"
                placeholder="https://app.client.com/specific-route"
              />
            </div>

            <div>
              <div className="flex items-center gap-3 text-blue-700 mb-6 border-l-4 border-blue-700 pl-4">
                <CheckCircle2 className="w-6 h-6" />
                <h4 className="text-xs font-black uppercase tracking-[0.3em]">Developer Recommendations</h4>
              </div>
              <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 tracking-widest">Remediation Steps</label>
              <textarea 
                rows="3"
                value={form.recommendations}
                onChange={(e) => setForm({...form, recommendations: e.target.value})}
                className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-blue-100 outline-none resize-none font-medium text-gray-700 leading-relaxed"
                placeholder="Specific guidance for the development team to resolve this issue..."
              />
            </div>
          </section>

          {/* Sticky Modal Footer */}
          <div className="pt-10 border-t flex gap-6 sticky bottom-0 bg-white">
            <button 
              type="button" 
              onClick={() => setIsModalOpen(false)}
              className="flex-1 px-8 py-5 border-2 border-gray-100 rounded-2xl font-black text-gray-400 hover:bg-gray-50 hover:border-gray-200 transition-all uppercase tracking-widest text-xs"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="flex-[2] px-8 py-5 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 uppercase tracking-[0.2em] text-xs"
            >
              {editingFinding ? "Confirm Updates" : "Commit Finding"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Report Preview Overlay */}
      {isPreviewOpen && (
        <ReportPreview 
          report={activeReport} 
          findings={reportFindings} 
          auditorName={auditorName}
          onBack={() => setIsPreviewOpen(false)} 
        />
      )}
    </div>
  );
}