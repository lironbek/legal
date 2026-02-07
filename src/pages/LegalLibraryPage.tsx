import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Book,
  Search,
  Filter,
  Star,
  BookOpen,
  Scale,
  FileText,
  Gavel,
  Shield,
  Building,
  Users,
  Heart,
  Eye,
  Bookmark
} from 'lucide-react';

const legalCategories = [
  { name: 'דיני עבודה', count: 156, icon: Users, color: 'bg-blue-500' },
  { name: 'דיני נזיקין', count: 89, icon: Shield, color: 'bg-red-500' },
  { name: 'דיני חוזים', count: 123, icon: FileText, color: 'bg-green-500' },
  { name: 'דיני מקרקעין', count: 78, icon: Building, color: 'bg-purple-500' },
  { name: 'דיני משפחה', count: 92, icon: Heart, color: 'bg-pink-500' },
  { name: 'דיני חברות', count: 67, icon: Building, color: 'bg-indigo-500' },
  { name: 'דין פלילי', count: 134, icon: Gavel, color: 'bg-blue-500' },
  { name: 'דין חוקתי', count: 45, icon: Scale, color: 'bg-teal-500' }
];

const legalResources = [
  {
    id: 'L001',
    title: 'חוק העבודה התשנח-1998',
    type: 'חוק',
    category: 'דיני עבודה',
    description: 'החוק המסדיר את יחסי העבודה בישראל',
    lastUpdated: '2024-06-01',
    views: 1245,
    rating: 4.8,
    bookmarked: true,
    status: 'עדכני',
    statusColor: 'bg-green-500'
  },
  {
    id: 'L002',
    title: 'פסיקת בית המשפט העליון - נזיקין',
    type: 'פסיקה',
    category: 'דיני נזיקין',
    description: 'אוסף פסקי דין חשובים בתחום הנזיקין',
    lastUpdated: '2024-06-15',
    views: 892,
    rating: 4.6,
    bookmarked: false,
    status: 'חדש',
    statusColor: 'bg-blue-500'
  },
  {
    id: 'L003',
    title: 'חוק החוזים (תרופות) התשל"א-1970',
    type: 'חוק',
    category: 'דיני חוזים',
    description: 'החוק הקובע את התרופות בגין הפרת חוזה',
    lastUpdated: '2024-05-20',
    views: 567,
    rating: 4.5,
    bookmarked: true,
    status: 'עדכני',
    statusColor: 'bg-green-500'
  },
  {
    id: 'L004',
    title: 'תקנות התכנון והבנייה',
    type: 'תקנות',
    category: 'דיני מקרקעין',
    description: 'תקנות המסדירות את הליכי התכנון והבנייה',
    lastUpdated: '2024-06-10',
    views: 743,
    rating: 4.3,
    bookmarked: false,
    status: 'מעודכן',
    statusColor: 'bg-blue-500'
  },
  {
    id: 'L005',
    title: 'חוק יחסי ממון בין בני זוג',
    type: 'חוק',
    category: 'דיני משפחה',
    description: 'החוק המסדיר את יחסי הממון בין בני זוג',
    lastUpdated: '2024-05-15',
    views: 934,
    rating: 4.7,
    bookmarked: true,
    status: 'עדכני',
    statusColor: 'bg-green-500'
  }
];

const quickAccess = [
  {
    title: 'חקיקה עדכנית',
    description: 'חוקים חדשים ועדכונים',
    icon: Book,
    count: 23,
    color: 'bg-blue-500'
  },
  {
    title: 'פסיקה אחרונה',
    description: 'פסקי דין מהחודש האחרון',
    icon: Gavel,
    count: 45,
    color: 'bg-purple-500'
  },
  {
    title: 'מועדפים',
    description: 'המסמכים שסימנת',
    icon: Star,
    count: 12,
    color: 'bg-blue-500'
  },
  {
    title: 'צפייה אחרונה',
    description: 'מסמכים שצפית בהם לאחרונה',
    icon: Eye,
    count: 8,
    color: 'bg-green-500'
  }
];

export default function LegalLibraryPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredResources, setFilteredResources] = useState(legalResources);
  const [selectedCategory, setSelectedCategory] = useState('all');

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);

    if (!value) {
      setFilteredResources(legalResources);
      return;
    }

    const filtered = legalResources.filter(
      (resource) =>
        resource.title.includes(value) ||
        resource.description.includes(value) ||
        resource.category.includes(value)
    );

    setFilteredResources(filtered);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'חוק':
        return <Scale className="h-4 w-4 text-blue-500" />;
      case 'פסיקה':
        return <Gavel className="h-4 w-4 text-purple-500" />;
      case 'תקנות':
        return <FileText className="h-4 w-4 text-green-500" />;
      default:
        return <Book className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const totalResources = legalResources.length;
  const totalCategories = legalCategories.length;
  const bookmarkedResources = legalResources.filter(r => r.bookmarked).length;

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <PageHeader
        title="ספרייה משפטית"
        subtitle="מאגר חקיקה, פסיקה ומידע משפטי מקיף"
        actions={
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button className="gap-2">
              <BookOpen className="h-4 w-4" /> הוסף למועדפים
            </Button>
          </motion.div>
        }
      />

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <Card className="border-border shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <Book className="h-6 w-6 text-primary" />
              </div>
              <div className="mr-4">
                <p className="text-2xl font-bold text-foreground">{totalResources}</p>
                <p className="text-muted-foreground text-sm">מסמכים משפטיים</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Scale className="h-6 w-6 text-purple-600" />
              </div>
              <div className="mr-4">
                <p className="text-2xl font-bold text-foreground">{totalCategories}</p>
                <p className="text-muted-foreground text-sm">תחומי משפט</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <Star className="h-6 w-6 text-primary" />
              </div>
              <div className="mr-4">
                <p className="text-2xl font-bold text-foreground">{bookmarkedResources}</p>
                <p className="text-muted-foreground text-sm">מסמכים מועדפים</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Access */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {quickAccess.map((item, index) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ scale: 1.02 }}
            className="cursor-pointer"
          >
            <Card className="bg-primary/5 border-border hover:shadow-md transition-shadow">
              <CardContent className="p-6 text-center">
                <div className={`w-12 h-12 ${item.color} rounded-xl flex items-center justify-center mx-auto mb-4`}>
                  <item.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm mb-2">{item.description}</p>
                <Badge variant="outline" className="border-border text-muted-foreground">
                  {item.count} פריטים
                </Badge>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Legal Categories */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="border-border shadow-sm">
          <CardHeader className="bg-muted/50">
            <CardTitle className="text-foreground font-display">תחומי משפט</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {legalCategories.map((category, index) => (
                <motion.div
                  key={category.name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <div className={`w-10 h-10 ${category.color} rounded-lg flex items-center justify-center`}>
                    <category.icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{category.name}</h3>
                    <p className="text-sm text-muted-foreground">{category.count} מסמכים</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Search and Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex flex-col sm:flex-row gap-4"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="חפש חוקים, פסיקה או תקנות..."
            value={searchTerm}
            onChange={handleSearch}
            className="w-full pl-9 pr-4 border-border"
          />
        </div>
        <div className="flex gap-2">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[180px] border-border">
              <SelectValue placeholder="בחר תחום" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל התחומים</SelectItem>
              {legalCategories.map((category) => (
                <SelectItem key={category.name} value={category.name}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" className="border-border hover:bg-muted/50">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>

      {/* Legal Resources */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="border-border shadow-sm">
          <CardHeader className="bg-muted/50">
            <CardTitle className="text-foreground font-display">מסמכים משפטיים</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {filteredResources.map((resource, index) => (
                <motion.div
                  key={resource.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-start gap-4 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    {getTypeIcon(resource.type)}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-foreground text-lg">{resource.title}</h3>
                        <p className="text-muted-foreground text-sm">{resource.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`${resource.statusColor} text-white`}>
                          {resource.status}
                        </Badge>
                        {resource.bookmarked && (
                          <Bookmark className="h-4 w-4 text-primary fill-current" />
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-6 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Scale className="h-3 w-3" />
                        <span>{resource.type}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        <span>{resource.category}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        <span>{resource.views} צפיות</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 text-primary" />
                        <span>{resource.rating}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-muted-foreground">עודכן: {resource.lastUpdated}</span>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" className="text-primary hover:bg-muted">
                          <Eye className="h-4 w-4 ml-1" /> צפה
                        </Button>
                        <Button variant="ghost" size="sm" className="text-primary hover:bg-muted">
                          <Bookmark className="h-4 w-4 ml-1" /> שמור
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
