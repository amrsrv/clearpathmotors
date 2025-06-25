import React from 'react';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Shield, User, Store } from 'lucide-react';
import { UserRole } from '../hooks/useUserRole';

interface RoleSelectorProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  disabled?: boolean;
}

const RoleSelector: React.FC<RoleSelectorProps> = ({ 
  currentRole, 
  onRoleChange,
  disabled = false
}) => {
  return (
    <Select
      value={currentRole || 'customer'}
      onValueChange={(value) => onRoleChange(value as UserRole)}
      disabled={disabled}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select role" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="super_admin" className="flex items-center">
          <div className="flex items-center">
            <Shield className="h-4 w-4 mr-2 text-purple-500" />
            <span>Super Admin</span>
          </div>
        </SelectItem>
        <SelectItem value="dealer">
          <div className="flex items-center">
            <Store className="h-4 w-4 mr-2 text-blue-500" />
            <span>Dealer</span>
          </div>
        </SelectItem>
        <SelectItem value="customer">
          <div className="flex items-center">
            <User className="h-4 w-4 mr-2 text-green-500" />
            <span>Customer</span>
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  );
};

export default RoleSelector;