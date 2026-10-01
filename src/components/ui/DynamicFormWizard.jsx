import React, { useState} from 'react';
import { Button} from '@/components/ui/button';
import { Input} from '@/components/ui/input';
import { powerSync} from "@/api/PowerSyncConnector";
import { useToast} from '@/components/ui/use-toast';
import { CheckCircle2, ChevronRight, ChevronLeft} from 'lucide-react';

export default function DynamicFormWizard({ fieldDefinitions = [], onRefresh, moduleDef}) {
 const { toast} = useToast();
 const [currentStep, setCurrentStep] = useState(0);
 const [formData, setFormData] = useState({});
 const [isSubmitting, setIsSubmitting] = useState(false);

 // Group fields into steps (3 fields per step)
 const steps = [];
 for (let i = 0; i < fieldDefinitions.length; i += 3) {
 steps.push(fieldDefinitions.slice(i, i + 3));
}
 
 if (steps.length === 0) {
 return <div className="p-8 text-center text-[#71717a] dark:text-gray-400 border-[0.5px] border-black/9 dark:border-white/8 rounded-xl border-dashed">No fields defined for this form.</div>;
}

 const currentFields = steps[currentStep];
 const isLastStep = currentStep === steps.length - 1;

 const handleChange = (name, value) => {
 setFormData(prev => ({ ...prev, [name]: value}));
};

 const handleNext = () => {
 // Basic validation
 const missing = currentFields.filter(f => f.is_required && !formData[f.name]);
 if (missing.length > 0) {
 toast({ title: 'Required Fields', description: `Please fill in: ${missing.map(f => f.name).join(', ')}`, variant: 'destructive'});
 return;
}
 setCurrentStep(prev => prev + 1);
};

 const handlePrev = () => {
 setCurrentStep(prev => prev - 1);
};

 const handleSubmit = async () => {
 // Validate last step
 const missing = currentFields.filter(f => f.is_required && !formData[f.name]);
 if (missing.length > 0) {
 toast({ title: 'Required Fields', description: `Please fill in: ${missing.map(f => f.name).join(', ')}`, variant: 'destructive'});
 return;
}

 setIsSubmitting(true);
 try {
 const payload = {
 company_id: moduleDef?.company_id,
 record_type: moduleDef?.module_name || 'custom_record',
 industry: moduleDef?.industry || 'custom',
 data: formData,
 search_text: JSON.stringify(formData).toLowerCase(),
 status: 'active'
};
 
 const keys = Object.keys(payload);
 const values = Object.values(payload).map(v => typeof v === 'object' ? JSON.stringify(v) : v);
 const placeholders = keys.map(() => '?').join(', ');
 await powerSync.execute(`INSERT INTO ${'industry_records'} (${keys.join(', ')}) VALUES (${placeholders})`, values);
 const error = null;
 if (error) throw error;
 
 toast({ title: 'Success', description: 'Record created successfully.'});
 setFormData({});
 setCurrentStep(0);
 if (onRefresh) onRefresh();
} catch (e) {
 toast({ title: 'Error', description: e.message, variant: 'destructive'});
} finally {
 setIsSubmitting(false);
}
};

 return (
 <div className="max-w-2xl mx-auto mt-8 bg-card border-[0.5px] border-black/9 dark:border-white/8 rounded-xl overflow-hidden hover:shadow-[0_2px_8px_rgba(0,0,0,0.07)] transition-shadow duration-200">
 {/* Progress Bar */}
 <div className="bg-muted/30 p-6 border-b">
 <div className="flex items-center justify-between mb-2">
 {steps.map((_, idx) => (
 <React.Fragment key={idx}>
 <div className={`flex flex-col items-center ${idx <= currentStep ? 'text-primary' : 'text-[#71717a] dark:text-gray-400'}`}>
 <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold mb-1 transition-colors ${idx < currentStep ? 'bg-primary text-white' : idx === currentStep ? 'bg-muted dark:bg-primary/70 border-2 border-primary' : 'bg-muted border-2 border-muted-foreground'}`}>
 {idx < currentStep ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
 </div>
 <span className="text-xs font-medium tracking-[0.04em]">Step {idx + 1}</span>
 </div>
 {idx < steps.length - 1 && (
 <div className={`flex-1 h-1 mx-2 rounded-full transition-colors ${idx < currentStep ? 'bg-primary' : 'bg-muted'}`} />
 )}
 </React.Fragment>
 ))}
 </div>
 </div>

 {/* Form Fields */}
 <div className="p-8 space-y-6">
 <h3 className="text-xl font-semibold mb-4">Step {currentStep + 1} Details</h3>
 {currentFields.map(field => (
 <div key={field.name} className="space-y-2">
 <label className="text-sm font-medium">
 {field.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
 {field.is_required && <span className="text-red-500 ml-1">*</span>}
 </label>
 {field.field_type === 'select' ? (
 <select
 className="flex h-10 w-full rounded-lg border-[0.5px] border-black/9 dark:border-white/8 border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-[#71717a] dark:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
 value={formData[field.name] || ''}
 onChange={e => handleChange(field.name, e.target.value)}
 >
 <option value="">Select an option</option>
 {(field.options || []).map(opt => (
 <option key={opt} value={opt}>{opt}</option>
 ))}
 </select>
 ) : field.field_type === 'boolean' ? (
 <div className="flex items-center gap-2">
 <input
 type="checkbox"
 className="h-4 w-4 rounded-md border-primary/40 text-primary focus:ring-primary"
 checked={!!formData[field.name]}
 onChange={e => handleChange(field.name, e.target.checked)}
 />
 <span className="text-sm text-[#71717a] dark:text-gray-400">Yes / True</span>
 </div>
 ) : (
 <Input
 type={field.field_type === 'number' ? 'number' : field.field_type === 'date' ? 'date' : 'text'}
 placeholder={`Enter ${field.name.replace(/_/g, ' ')}...`}
 value={formData[field.name] || ''}
 onChange={e => handleChange(field.name, e.target.value)}
 />
 )}
 </div>
 ))}
 </div>

 {/* Footer Navigation */}
 <div className="bg-muted/30 p-4 border-t flex items-center justify-between">
 <Button variant="outline" onClick={handlePrev} disabled={currentStep === 0}>
 <ChevronLeft className="w-4 h-4 mr-2" /> Previous
 </Button>
 {isLastStep ? (
 <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-primary hover:bg-primary/90 text-white">
 {isSubmitting ? 'Saving...' : 'Submit'} <CheckCircle2 className="w-4 h-4 ml-2" />
 </Button>
 ) : (
 <Button onClick={handleNext}>
 Next <ChevronRight className="w-4 h-4 ml-2" />
 </Button>
 )}
 </div>
 </div>
 );
}
