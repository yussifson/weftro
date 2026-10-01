import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, Download, Play, Check } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

const TEMPLATES = [
  {
    id: "nda",
    name: "Non-Disclosure Agreement",
    content: "This Non-Disclosure Agreement (the \"Agreement\") is entered into by and between Slate Inc. and {{client_name}} on {{date}}.\n\n1. Confidential Information: {{client_name}} agrees not to disclose..."
  },
  {
    id: "offer_letter",
    name: "Employment Offer Letter",
    content: "Dear {{candidate_name}},\n\nWe are pleased to offer you the position of {{job_title}} at our company starting on {{start_date}}.\n\nSincerely,\nHR Department"
  },
  {
    id: "invoice",
    name: "Standard Invoice",
    content: "INVOICE\n\nTo: {{client_name}}\nDate: {{date}}\nAmount Due: {{amount}}\n\nPlease remit payment within 30 days."
  }
];

export default function DocumentGenerator({ onGenerate }) {
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0]);
  const [variables, setVariables] = useState({});
  const [generatedDoc, setGeneratedDoc] = useState(null);

  // Extract variables (e.g. {{client_name}}) from template content
  const extractVariables = (content) => {
    const regex = /{{(.*?)}}/g;
    const matches = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
      if (!matches.includes(match[1])) {
        matches.push(match[1]);
      }
    }
    return matches;
  };

  const templateVars = extractVariables(selectedTemplate.content);

  const handleVarChange = (key, value) => {
    setVariables(prev => ({ ...prev, [key]: value }));
  };

  const handlePreview = () => {
    let doc = selectedTemplate.content;
    templateVars.forEach(v => {
      const regex = new RegExp(`{{${v}}}`, 'g');
      doc = doc.replace(regex, variables[v] || `[${v.replace(/_/g, ' ')}]`);
    });
    setGeneratedDoc(doc);
    toast({ title: "Preview Generated" });
  };

  const handleDownload = () => {
    if (!generatedDoc) return;
    const blob = new Blob([generatedDoc], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedTemplate.id}_generated.txt`;
    a.click();
    URL.revokeObjectURL(url);
    if (onGenerate) onGenerate(generatedDoc);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-card p-6 rounded-xl border border-border shadow-sm">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-primary" />
            Document Templates
          </h3>
          <div className="grid grid-cols-1 gap-3">
            {TEMPLATES.map(tpl => (
              <button
                key={tpl.id}
                onClick={() => {
                  setSelectedTemplate(tpl);
                  setVariables({});
                  setGeneratedDoc(null);
                }}
                className={`flex flex-col text-left p-4 rounded-xl border transition-all ${
                  selectedTemplate.id === tpl.id 
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/20' 
                    : 'border-border bg-background hover:border-primary/50'
                }`}
              >
                <span className="font-semibold">{tpl.name}</span>
                <span className="text-xs text-muted-foreground mt-1">
                  {extractVariables(tpl.content).length} variables
                </span>
              </button>
            ))}
          </div>
        </div>
        
        {templateVars.length > 0 && (
          <div className="space-y-4 bg-muted/30 p-4 rounded-xl border border-border">
            <h4 className="font-medium text-sm text-muted-foreground">Fill Variables</h4>
            {templateVars.map(v => (
              <div key={v} className="space-y-1">
                <label className="text-xs font-semibold capitalize text-foreground">
                  {v.replace(/_/g, ' ')}
                </label>
                <Input
                  value={variables[v] || ''}
                  onChange={e => handleVarChange(v, e.target.value)}
                  placeholder={`Enter ${v.replace(/_/g, ' ')}...`}
                  className="bg-background"
                />
              </div>
            ))}
            <Button onClick={handlePreview} className="w-full gap-2 mt-4">
              <Play className="w-4 h-4" /> Generate Preview
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-col h-full space-y-4">
        <h3 className="text-lg font-semibold">Document Preview</h3>
        <div className="flex-1 bg-white dark:bg-card border border-border rounded-xl p-6 overflow-y-auto whitespace-pre-wrap font-serif text-slate-800 dark:text-foreground shadow-inner min-h-[300px]">
          {generatedDoc ? generatedDoc : <span className="text-muted-foreground italic">Fill variables and click generate to preview document.</span>}
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" disabled={!generatedDoc} onClick={() => setGeneratedDoc(null)}>Clear</Button>
          <Button onClick={handleDownload} disabled={!generatedDoc} className="gap-2">
            <Download className="w-4 h-4" /> Download Document
          </Button>
        </div>
      </div>
    </div>
  );
}
