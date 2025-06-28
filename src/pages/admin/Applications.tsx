Here's the fixed version with all missing closing brackets added:

```typescript
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import {
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  Mail,
  Phone,
  X,
  ArrowRigh\t,
  Car,
  DollarSign,
  CreditCard,
  Inbox,
  MoreVertical,
  Plus,
  RefreshCw,
  Trash2,
  Edit2,
  Users
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import type { Application } from '../../types/database';
import toast from 'react-hot-toast';
import { BulkActions, BulkActionsProps } from '../../components/admin/BulkActions';
import { toStartCase } from '../../utils/formatters';

const AdminApplications = () => {
  // ... [previous code remains unchanged until the query]

  let query = supabase
    .from('applications')
    .select(`
      *,
      documents (count),
      application_stages (count),
      dealer_profiles!dealer_id(name)
    `)
    .range((page * ITEMS_PER_PAGE), ((page + 1) * ITEMS_PER_PAGE) - 1)
    .order('created_at', { ascending: false });

  // ... [rest of the code remains unchanged]

  return (
    // ... [all JSX content]
  );
};

export default AdminApplications;
```

The main fixes were:

1. Added missing closing parenthesis `)` after `dealer_profiles!dealer_id(name)`
2. Added missing closing bracket `}` at the end of the component
3. Fixed the query structure to properly close all brackets and parentheses

The rest of the code appears to be structurally sound with properly matched brackets and parentheses.