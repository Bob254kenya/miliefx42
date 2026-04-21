import { useState, useMemo, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Download, Upload, Copy, Check, FileJson, FileCode, CheckCircle,
  AlertTriangle, Package, ChevronDown, ChevronRight,
} from 'lucide-react';

export interface BotConfig {
  version: number;
  m1: {
    enabled: boolean; symbol: string; contract: string; barrier: string;
    hookEnabled: boolean; virtualLossCount: string; realCount: string;
  };
  m2: {
    enabled: boolean; symbol: string; contract: string; barrier: string;
    hookEnabled: boolean; virtualLossCount: string; realCount: string;
  };
  risk: {
    stake: string; martingaleOn: boolean; martingaleMultiplier: string;
    martingaleMaxSteps: string; takeProfit: string; stopLoss: string;
  };
  strategy: {
    m1Enabled: boolean; m2Enabled: boolean;
    m1Mode: 'pattern' | 'digit'; m2Mode: 'pattern' | 'digit';
    m1Pattern: string; m1DigitCondition: string; m1DigitCompare: string; m1DigitWindow: string;
    m2Pattern: string; m2DigitCondition: string; m2DigitCompare: string; m2DigitWindow: string;
  };
  scanner: { active: boolean };
  turbo: { enabled: boolean };
}

/* ── Templates ── */
const TEMPLATES: { name: string; description: string; config: BotConfig }[] = [
  {
    name: 'Conservative',
    description: 'Low risk, small stakes, no martingale',
    config: {
      version: 1,
      m1: { enabled: true, symbol: 'R_100', contract: 'DIGITEVEN', barrier: '5', hookEnabled: false, virtualLossCount: '3', realCount: '2' },
      m2: { enabled: true, symbol: 'R_50', contract: 'DIGITODD', barrier: '5', hookEnabled: false, virtualLossCount: '3', realCount: '2' },
      risk: { stake: '0.35', martingaleOn: false, martingaleMultiplier: '2.0', martingaleMaxSteps: '3', takeProfit: '5', stopLoss: '3' },
      strategy: { m1Enabled: false, m2Enabled: false, m1Mode: 'pattern', m2Mode: 'pattern', m1Pattern: '', m1DigitCondition: '==', m1DigitCompare: '5', m1DigitWindow: '3', m2Pattern: '', m2DigitCondition: '==', m2DigitCompare: '5', m2DigitWindow: '3' },
      scanner: { active: false }, turbo: { enabled: false },
    },
  },
  {
    name: 'Aggressive Martingale',
    description: 'High risk, martingale recovery, turbo mode',
    config: {
      version: 1,
      m1: { enabled: true, symbol: 'R_100', contract: 'DIGITEVEN', barrier: '5', hookEnabled: false, virtualLossCount: '3', realCount: '2' },
      m2: { enabled: true, symbol: 'R_50', contract: 'DIGITODD', barrier: '5', hookEnabled: false, virtualLossCount: '3', realCount: '2' },
      risk: { stake: '1.00', martingaleOn: true, martingaleMultiplier: '2.5', martingaleMaxSteps: '5', takeProfit: '25', stopLoss: '15' },
      strategy: { m1Enabled: false, m2Enabled: false, m1Mode: 'pattern', m2Mode: 'pattern', m1Pattern: '', m1DigitCondition: '==', m1DigitCompare: '5', m1DigitWindow: '3', m2Pattern: '', m2DigitCondition: '==', m2DigitCompare: '5', m2DigitWindow: '3' },
      scanner: { active: false }, turbo: { enabled: true },
    },
  },
  {
    name: 'Pattern Scanner',
    description: 'Strategy-driven with scanner on both markets',
    config: {
      version: 1,
      m1: { enabled: true, symbol: 'R_100', contract: 'DIGITMATCH', barrier: '5', hookEnabled: false, virtualLossCount: '3', realCount: '2' },
      m2: { enabled: true, symbol: 'R_75', contract: 'DIGITDIFF', barrier: '3', hookEnabled: false, virtualLossCount: '3', realCount: '2' },
      risk: { stake: '0.50', martingaleOn: true, martingaleMultiplier: '2.0', martingaleMaxSteps: '4', takeProfit: '15', stopLoss: '8' },
      strategy: { m1Enabled: true, m2Enabled: true, m1Mode: 'pattern', m2Mode: 'digit', m1Pattern: 'EEOE', m1DigitCondition: '==', m1DigitCompare: '5', m1DigitWindow: '3', m2Pattern: '', m2DigitCondition: '>', m2DigitCompare: '5', m2DigitWindow: '3' },
      scanner: { active: true }, turbo: { enabled: false },
    },
  },
  {
    name: 'Virtual Hook Pro',
    description: 'Both markets with virtual hook enabled',
    config: {
      version: 1,
      m1: { enabled: true, symbol: 'R_100', contract: 'DIGITEVEN', barrier: '5', hookEnabled: true, virtualLossCount: '4', realCount: '3' },
      m2: { enabled: true, symbol: 'R_50', contract: 'DIGITODD', barrier: '5', hookEnabled: true, virtualLossCount: '3', realCount: '2' },
      risk: { stake: '0.50', martingaleOn: true, martingaleMultiplier: '2.0', martingaleMaxSteps: '5', takeProfit: '20', stopLoss: '10' },
      strategy: { m1Enabled: false, m2Enabled: false, m1Mode: 'pattern', m2Mode: 'pattern', m1Pattern: '', m1DigitCondition: '==', m1DigitCompare: '5', m1DigitWindow: '3', m2Pattern: '', m2DigitCondition: '==', m2DigitCompare: '5', m2DigitWindow: '3' },
      scanner: { active: false }, turbo: { enabled: false },
    },
  },
];

/* ── JSON → XML converter ── */
function jsonToXml(obj: any, indent = 0, rootTag = 'botConfiguration'): string {
  const pad = '  '.repeat(indent);
  let xml = '';

  if (indent === 0) {
    xml += '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += `<${rootTag}>\n`;
  }

  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val === null || val === undefined) continue;

    if (Array.isArray(val)) {
      xml += `${pad}  <${key}>\n`;
      val.forEach((item) => {
        if (typeof item === 'object') {
          xml += `${pad}    <item>\n${jsonToXml(item, indent + 3)}\n${pad}    </item>\n`;
        } else {
          xml += `${pad}    <item>${escapeXml(String(item))}</item>\n`;
        }
      });
      xml += `${pad}  </${key}>\n`;
    } else if (typeof val === 'object') {
      xml += `${pad}  <${key}>\n${jsonToXml(val, indent + 1)}${pad}  </${key}>\n`;
    } else {
      xml += `${pad}  <${key}>${escapeXml(String(val))}</${key}>\n`;
    }
  }

  if (indent === 0) {
    xml += `</${rootTag}>`;
  }
  return xml;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

/* ── XML → JSON parser ── */
function xmlToJson(xml: string): any {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');
  const errors = doc.getElementsByTagName('parsererror');
  if (errors.length > 0) throw new Error('Invalid XML');

  function nodeToObj(node: Element): any {
    const obj: any = {};
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      const key = child.tagName;
      if (child.children.length === 0) {
        const text = child.textContent || '';
        // Try to cast
        if (text === 'true') obj[key] = true;
        else if (text === 'false') obj[key] = false;
        else if (!isNaN(Number(text)) && text.trim() !== '') obj[key] = text; // keep as string for config
        else obj[key] = text;
      } else if (Array.from(child.children).every(c => c.tagName === 'item')) {
        obj[key] = Array.from(child.children).map(c =>
          c.children.length > 0 ? nodeToObj(c) : c.textContent || ''
        );
      } else {
        if (obj[key] !== undefined) {
          if (!Array.isArray(obj[key])) obj[key] = [obj[key]];
          obj[key].push(nodeToObj(child));
        } else {
          obj[key] = nodeToObj(child);
        }
      }
    }
    return obj;
  }

  const root = doc.documentElement;
  return nodeToObj(root);
}

/* ── Validate config structure ── */
function validateConfig(cfg: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!cfg.version) errors.push('Missing version');
  if (!cfg.m1) errors.push('Missing m1 config');
  if (!cfg.m2) errors.push('Missing m2 config');
  if (!cfg.risk) errors.push('Missing risk config');
  if (cfg.risk) {
    if (!cfg.risk.stake) errors.push('Missing stake');
    if (!cfg.risk.takeProfit) errors.push('Missing takeProfit');
    if (!cfg.risk.stopLoss) errors.push('Missing stopLoss');
  }
  return { valid: errors.length === 0, errors };
}

/* ── Timestamp helper ── */
function getTimestamp(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;
}

/* ── Collapsible JSON section ── */
function CollapsibleSection({ label, children, defaultOpen = true }: { label: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-colors w-full text-left">
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        {label}
      </button>
      {open && <div className="ml-3 mt-0.5">{children}</div>}
    </div>
  );
}

/* ── Main Component ── */
interface ConfigPreviewProps {
  config: BotConfig;
  onLoadConfig: (cfg: BotConfig) => void;
  disabled?: boolean;
}

export default function ConfigPreview({ config, onLoadConfig, disabled = false }: ConfigPreviewProps) {
  const [copiedJson, setCopiedJson] = useState(false);
  const [copiedXml, setCopiedXml] = useState(false);
  const [jsonCollapsed, setJsonCollapsed] = useState<Record<string, boolean>>({});
  const [loadingJson, setLoadingJson] = useState(false);
  const [loadingXml, setLoadingXml] = useState(false);

  const jsonStr = useMemo(() => JSON.stringify(config, null, 2), [config]);
  const xmlStr = useMemo(() => jsonToXml(config), [config]);

  const validation = useMemo(() => validateConfig(config), [config]);

  const jsonLines = jsonStr.split('\n').length;
  const xmlLines = xmlStr.split('\n').length;

  /* ── Keyboard shortcuts ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (disabled) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSaveJson();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault();
        handleLoadJson();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, disabled]);

  /* ── Save JSON ── */
  const handleSaveJson = useCallback(() => {
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `bot_config_${getTimestamp()}.json`; a.click();
    URL.revokeObjectURL(url);
    toast.success('JSON configuration saved successfully');
  }, [jsonStr]);

  /* ── Save XML ── */
  const handleSaveXml = useCallback(() => {
    const blob = new Blob([xmlStr], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `bot_config_${getTimestamp()}.xml`; a.click();
    URL.revokeObjectURL(url);
    toast.success('XML configuration saved successfully');
  }, [xmlStr]);

  /* ── Save Both as ZIP (simple concatenation since no zip lib) ── */
  const handleExportAll = useCallback(() => {
    // Save both individually
    handleSaveJson();
    setTimeout(() => handleSaveXml(), 500);
    toast.success('Both JSON and XML configs exported');
  }, [handleSaveJson, handleSaveXml]);

  /* ── Load JSON ── */
  const handleLoadJson = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.onchange = (ev: any) => {
      const file = ev.target.files?.[0];
      if (!file) return;
      setLoadingJson(true);
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const parsed = JSON.parse(e.target?.result as string);
          const { valid, errors } = validateConfig(parsed);
          if (!valid) {
            toast.error(`Invalid config: ${errors.join(', ')}`);
            console.error('Config validation errors:', errors);
            setLoadingJson(false);
            return;
          }
          onLoadConfig(parsed as BotConfig);
          toast.success('JSON configuration loaded successfully');
        } catch (err) {
          console.error('JSON parse error:', err);
          toast.error('Error parsing JSON file');
        }
        setLoadingJson(false);
      };
      reader.readAsText(file);
    };
    input.click();
  }, [onLoadConfig]);

  /* ── Load XML ── */
  const handleLoadXml = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.xml';
    input.onchange = (ev: any) => {
      const file = ev.target.files?.[0];
      if (!file) return;
      setLoadingXml(true);
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const xmlData = e.target?.result as string;
          const parsed = xmlToJson(xmlData);
          // Convert boolean strings back
          const fixBools = (obj: any): any => {
            if (typeof obj !== 'object' || obj === null) return obj;
            const result: any = Array.isArray(obj) ? [] : {};
            for (const k of Object.keys(obj)) {
              const v = obj[k];
              if (v === 'true') result[k] = true;
              else if (v === 'false') result[k] = false;
              else if (typeof v === 'object') result[k] = fixBools(v);
              else result[k] = v;
            }
            return result;
          };
          const fixed = fixBools(parsed);
          const { valid, errors } = validateConfig(fixed);
          if (!valid) {
            toast.error(`Invalid XML config: ${errors.join(', ')}`);
            console.error('XML config validation errors:', errors);
            setLoadingXml(false);
            return;
          }
          onLoadConfig(fixed as BotConfig);
          toast.success('XML configuration loaded successfully');
        } catch (err) {
          console.error('XML parse error:', err);
          toast.error('Error parsing XML file');
        }
        setLoadingXml(false);
      };
      reader.readAsText(file);
    };
    input.click();
  }, [onLoadConfig]);

  /* ── Copy to clipboard ── */
  const copyToClipboard = useCallback(async (text: string, format: 'json' | 'xml') => {
    try {
      await navigator.clipboard.writeText(text);
      if (format === 'json') { setCopiedJson(true); setTimeout(() => setCopiedJson(false), 2000); }
      else { setCopiedXml(true); setTimeout(() => setCopiedXml(false), 2000); }
      toast.success(`${format.toUpperCase()} copied to clipboard`);
    } catch { toast.error('Failed to copy'); }
  }, []);

  /* ── Load template ── */
  const handleTemplate = useCallback((idx: string) => {
    const tmpl = TEMPLATES[parseInt(idx)];
    if (tmpl) {
      onLoadConfig(tmpl.config);
      toast.success(`Template "${tmpl.name}" loaded`);
    }
  }, [onLoadConfig]);

  /* ── Syntax-highlighted JSON ── */
  const renderJsonHighlighted = useMemo(() => {
    const lines = jsonStr.split('\n');
    return lines.map((line, i) => {
      const highlighted = line
        .replace(/"([^"]+)":/g, '<span class="text-primary">"$1"</span>:')
        .replace(/: "([^"]*)"/g, ': <span class="text-profit">"$1"</span>')
        .replace(/: (true|false)/g, ': <span class="text-warning">$1</span>')
        .replace(/: (\d+\.?\d*)/g, ': <span class="text-signal">$1</span>');
      return (
        <div key={i} className="flex">
          <span className="text-muted-foreground/40 select-none w-6 text-right mr-2 shrink-0">{i + 1}</span>
          <span dangerouslySetInnerHTML={{ __html: highlighted }} />
        </div>
      );
    });
  }, [jsonStr]);

  /* ── Syntax-highlighted XML ── */
  const renderXmlHighlighted = useMemo(() => {
    const lines = xmlStr.split('\n');
    return lines.map((line, i) => {
      const highlighted = line
        .replace(/&lt;/g, '⟨LT⟩').replace(/&gt;/g, '⟨GT⟩')
        .replace(/<(\/?[\w]+)>/g, '<span class="text-primary">&lt;$1&gt;</span>')
        .replace(/<\?([^?]+)\?>/g, '<span class="text-muted-foreground">&lt;?$1?&gt;</span>')
        .replace(/>([^<]+)</g, (_, content) => {
          if (content.trim() === '') return `>${content}<`;
          if (content === 'true' || content === 'false') return `><span class="text-warning">${content}</span><`;
          if (!isNaN(Number(content.trim()))) return `><span class="text-signal">${content}</span><`;
          return `><span class="text-profit">${content}</span><`;
        })
        .replace(/⟨LT⟩/g, '&lt;').replace(/⟨GT⟩/g, '&gt;');
      return (
        <div key={i} className="flex">
          <span className="text-muted-foreground/40 select-none w-6 text-right mr-2 shrink-0">{i + 1}</span>
          <span dangerouslySetInnerHTML={{ __html: highlighted }} />
        </div>
      );
    });
  }, [xmlStr]);

  return (
    <div className="bg-card border border-border rounded-xl p-3 space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5 text-primary" />
            Bot Configuration Preview
          </h3>
          {validation.valid ? (
            <Badge variant="outline" className="text-[8px] h-4 gap-0.5 border-profit/50 text-profit">
              <CheckCircle className="w-2.5 h-2.5" /> Valid
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[8px] h-4 gap-0.5 border-warning/50 text-warning">
              <AlertTriangle className="w-2.5 h-2.5" /> Issues
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {/* Template dropdown */}
          <Select onValueChange={handleTemplate} disabled={disabled}>
            <SelectTrigger className="h-6 text-[9px] w-28">
              <SelectValue placeholder="Templates..." />
            </SelectTrigger>
            <SelectContent>
              {TEMPLATES.map((t, i) => (
                <SelectItem key={i} value={String(i)} className="text-xs">
                  <span className="font-semibold">{t.name}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" className="h-6 text-[9px] gap-1 px-2" onClick={handleExportAll} disabled={disabled}>
            <Download className="w-2.5 h-2.5" /> Export All
          </Button>
        </div>
      </div>

      {/* Split View */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {/* JSON Column */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <FileJson className="w-3.5 h-3.5 text-primary" />
              <span className="text-[10px] font-semibold text-foreground">JSON Format</span>
              <span className="text-[8px] text-muted-foreground">{jsonStr.length} chars · {jsonLines} lines</span>
            </div>
            <Button
              size="sm" variant="ghost" className="h-5 w-5 p-0"
              onClick={() => copyToClipboard(jsonStr, 'json')}
              title="Copy to clipboard"
              aria-label="Copy JSON to clipboard"
            >
              {copiedJson ? <Check className="w-3 h-3 text-profit" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
            </Button>
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" className="h-6 text-[9px] gap-1 flex-1" onClick={handleSaveJson} disabled={disabled}>
              <Download className="w-2.5 h-2.5" /> Save JSON
            </Button>
            <Button size="sm" variant="outline" className="h-6 text-[9px] gap-1 flex-1" onClick={handleLoadJson} disabled={disabled || loadingJson}>
              {loadingJson ? <span className="animate-spin">⟳</span> : <Upload className="w-2.5 h-2.5" />} Load JSON
            </Button>
          </div>
          <div className="bg-muted/30 border border-border/50 rounded-lg max-h-[400px] overflow-auto p-2 font-mono text-[9px] leading-relaxed select-all" aria-label="JSON configuration preview">
            {renderJsonHighlighted}
          </div>
        </div>

        {/* XML Column */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <FileCode className="w-3.5 h-3.5 text-primary" />
              <span className="text-[10px] font-semibold text-foreground">XML Format</span>
              <span className="text-[8px] text-muted-foreground">{xmlStr.length} chars · {xmlLines} lines</span>
            </div>
            <Button
              size="sm" variant="ghost" className="h-5 w-5 p-0"
              onClick={() => copyToClipboard(xmlStr, 'xml')}
              title="Copy to clipboard"
              aria-label="Copy XML to clipboard"
            >
              {copiedXml ? <Check className="w-3 h-3 text-profit" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
            </Button>
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" className="h-6 text-[9px] gap-1 flex-1" onClick={handleSaveXml} disabled={disabled}>
              <Download className="w-2.5 h-2.5" /> Save XML
            </Button>
            <Button size="sm" variant="outline" className="h-6 text-[9px] gap-1 flex-1" onClick={handleLoadXml} disabled={disabled || loadingXml}>
              {loadingXml ? <span className="animate-spin">⟳</span> : <Upload className="w-2.5 h-2.5" />} Load XML
            </Button>
          </div>
          <div className="bg-muted/30 border border-border/50 rounded-lg max-h-[400px] overflow-auto p-2 font-mono text-[9px] leading-relaxed select-all" aria-label="XML configuration preview">
            {renderXmlHighlighted}
          </div>
        </div>
      </div>

      {/* Footer hint */}
      <div className="text-[8px] text-muted-foreground text-center">
        Ctrl+S to save JSON · Ctrl+O to load JSON · Config auto-syncs with panel changes
      </div>
    </div>
  );
}
