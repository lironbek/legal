import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Palette, RotateCcw, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function DesignSettings() {
  const [logo, setLogo] = useState<string | null>(null);
  const [colors, setColors] = useState({
    primary: '#3b82f6',
    secondary: '#ffffff',
    accent: '#f8fafc',
    background: '#ffffff'
  });
  const [previewMode, setPreviewMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Load saved colors or use clean defaults
  useEffect(() => {
    const savedColors = localStorage.getItem('app-colors');
    if (savedColors) {
      try {
        const parsedColors = JSON.parse(savedColors);
        setColors(parsedColors);
        applyColors(parsedColors);
      } catch (e) {
        // If parsing fails, use default clean colors
        const defaultColors = {
          primary: '#3b82f6',
          secondary: '#ffffff',
          accent: '#f8fafc',
          background: '#ffffff'
        };
        setColors(defaultColors);
        applyColors(defaultColors);
      }
    }
  }, []);

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast({
          title: "שגיאה",
          description: "קובץ הלוגו גדול מדי. מקסימום 2MB",
          variant: "destructive"
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setLogo(result);
        localStorage.setItem('app-logo', result);
        toast({
          title: "הצלחה",
          description: "הלוגו הועלה בהצלחה"
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleColorChange = (colorKey: string, value: string) => {
    const newColors = { ...colors, [colorKey]: value };
    setColors(newColors);
    
    if (previewMode) {
      applyColors(newColors);
    }
  };

  const applyColors = (colorSet: typeof colors) => {
    const root = document.documentElement;
    
    // Convert hex to HSL and apply
    const hexToHsl = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h, s;
      const l = (max + min) / 2;

      if (max === min) {
        h = s = 0;
      } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h = (b - r) / d + 2; break;
          case b: h = (r - g) / d + 4; break;
          default: h = 0;
        }
        h /= 6;
      }

      return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
    };

    root.style.setProperty('--primary', hexToHsl(colorSet.primary));
    root.style.setProperty('--secondary', hexToHsl(colorSet.secondary));
    root.style.setProperty('--accent', hexToHsl(colorSet.accent));
    root.style.setProperty('--background', hexToHsl(colorSet.background));
  };

  const saveColors = () => {
    localStorage.setItem('app-colors', JSON.stringify(colors));
    applyColors(colors);
    toast({
      title: "הצלחה",
      description: "צבעי המערכת נשמרו בהצלחה"
    });
  };

  const resetColors = () => {
    const defaultColors = {
      primary: '#3b82f6',
      secondary: '#ffffff',
      accent: '#f8fafc',
      background: '#ffffff'
    };
    setColors(defaultColors);
    localStorage.removeItem('app-colors');
    
    // Reset to default CSS variables
    const root = document.documentElement;
    root.style.removeProperty('--primary');
    root.style.removeProperty('--secondary');
    root.style.removeProperty('--accent');
    root.style.removeProperty('--background');
    
    toast({
      title: "הצלחה",
      description: "הצבעים אופסו לברירת המחדל"
    });
  };

  const removeLogo = () => {
    setLogo(null);
    localStorage.removeItem('app-logo');
    toast({
      title: "הצלחה",
      description: "הלוגו הוסר"
    });
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Logo Upload */}
      <Card className="bg-background border border-border">
        <CardHeader className="bg-muted/50 border-b border-border">
          <CardTitle className="flex items-center gap-2 text-foreground justify-end">
            <Upload className="h-5 w-5" />
            לוגו המערכת
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 bg-background">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label htmlFor="logo-upload" className="text-foreground text-right block">העלאת לוגו (PNG, JPG - מקסימום 2MB)</Label>
              <input
                ref={fileInputRef}
                id="logo-upload"
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="w-full mt-2 bg-background text-foreground border-input hover:bg-muted/50"
              >
                <Upload className="h-4 w-4 ml-2" />
                בחר קובץ
              </Button>
            </div>
            
            {logo && (
              <div className="w-32 h-32 border-2 border-dashed border-input rounded-lg flex items-center justify-center bg-muted/50">
                <img
                  src={logo}
                  alt="Logo preview"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            )}
          </div>

          {logo && (
            <Button onClick={removeLogo} variant="destructive" className="bg-destructive hover:bg-destructive/90">
              הסר לוגו
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Color Customization */}
      <Card className="bg-background border border-border">
        <CardHeader className="bg-muted/50 border-b border-border">
          <CardTitle className="flex items-center gap-2 text-foreground justify-end">
            <Palette className="h-5 w-5" />
            צבעי המערכת
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 bg-background">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="primary-color" className="text-foreground text-right block">צבע ראשי</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="primary-color"
                  type="color"
                  value={colors.primary}
                  onChange={(e) => handleColorChange('primary', e.target.value)}
                  className="w-16 h-10 p-1 border-2 border-input"
                />
                <Input
                  type="text"
                  value={colors.primary}
                  onChange={(e) => handleColorChange('primary', e.target.value)}
                  className="flex-1 bg-background text-foreground border-input text-right"
                  placeholder="#6366f1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="secondary-color" className="text-foreground text-right block">צבע משני</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="secondary-color"
                  type="color"
                  value={colors.secondary}
                  onChange={(e) => handleColorChange('secondary', e.target.value)}
                  className="w-16 h-10 p-1 border-2 border-input"
                />
                <Input
                  type="text"
                  value={colors.secondary}
                  onChange={(e) => handleColorChange('secondary', e.target.value)}
                  className="flex-1 bg-background text-foreground border-input text-right"
                  placeholder="#ffffff"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="accent-color" className="text-foreground text-right block">צבע הדגשה</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="accent-color"
                  type="color"
                  value={colors.accent}
                  onChange={(e) => handleColorChange('accent', e.target.value)}
                  className="w-16 h-10 p-1 border-2 border-input"
                />
                <Input
                  type="text"
                  value={colors.accent}
                  onChange={(e) => handleColorChange('accent', e.target.value)}
                  className="flex-1 bg-background text-foreground border-input text-right"
                  placeholder="#f8fafc"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="background-color" className="text-foreground text-right block">רקע ראשי</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="background-color"
                  type="color"
                  value={colors.background}
                  onChange={(e) => handleColorChange('background', e.target.value)}
                  className="w-16 h-10 p-1 border-2 border-input"
                />
                <Input
                  type="text"
                  value={colors.background}
                  onChange={(e) => handleColorChange('background', e.target.value)}
                  className="flex-1 bg-background text-foreground border-input text-right"
                  placeholder="#ffffff"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-border">
            <Button
              onClick={() => {
                setPreviewMode(!previewMode);
                if (!previewMode) {
                  applyColors(colors);
                }
              }}
              variant="outline"
              className="flex items-center gap-2 bg-background text-foreground border-input hover:bg-muted/50"
            >
              <Eye className="h-4 w-4" />
              {previewMode ? 'עצור תצוגה מקדימה' : 'תצוגה מקדימה'}
            </Button>
            
            <Button onClick={saveColors} className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
              שמור צבעים
            </Button>
            
            <Button onClick={resetColors} variant="destructive" className="flex items-center gap-2 bg-destructive hover:bg-destructive/90">
              <RotateCcw className="h-4 w-4" />
              איפוס לברירת מחדל
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}