import React from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Car, Calculator } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabaseClient';

const transition = {
  type: "spring",
  mass: 0.5,
  damping: 11.5,
  stiffness: 100,
  restDelta: 0.001,
  restSpeed: 0.001,
};

export const MenuItem = ({
  setActive,
  active,
  item,
  children,
}: {
  setActive: (item: string) => void;
  active: string | null;
  item: string;
  children?: React.ReactNode;
}) => {
  return (
    <div onMouseEnter={() => setActive(item)} className="relative">
      <motion.p
        transition={{ duration: 0.3 }}
        className="cursor-pointer text-inherit hover:text-[#3BAA75] transition-colors"
      >
        {item}
      </motion.p>
      {active !== null && (
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={transition}
        >
          {active === item && (
            <div className="absolute top-[calc(100%_+_1.2rem)] left-1/2 transform -translate-x-1/2 z-50">
              <motion.div
                transition={transition}
                layoutId="active"
                className="bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-xl"
              >
                <motion.div layout className="w-max h-full p-4">
                  {children}
                </motion.div>
              </motion.div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

export const Menu = ({
  setActive,
  children,
}: {
  setActive: (item: string | null) => void;
  children: React.ReactNode;
}) => {
  return (
    <nav
      onMouseLeave={() => setActive(null)}
      className="relative rounded-full border border-gray-200 bg-white/80 backdrop-blur-sm shadow-sm flex justify-center space-x-4 px-8 py-4"
    >
      {children}
    </nav>
  );
};

export const ProductItem = ({
  title,
  description,
  onClick,
  icon,
}: {
  title: string;
  description: string;
  onClick: () => void;
  icon: React.ReactNode;
}) => {
  return (
    <button 
      onClick={onClick}
      className="flex space-x-4 items-start p-2 rounded-lg hover:bg-gray-50 transition-colors w-full text-left"
    >
      <div className="p-2 bg-[#3BAA75]/10 rounded-lg">
        {icon}
      </div>
      <div>
        <h4 className="text-base font-semibold text-gray-900 mb-1">
          {title}
        </h4>
        <p className="text-sm text-gray-600 max-w-[10rem]">
          {description}
        </p>
      </div>
    </button>
  );
};

export const HoveredLink = ({ children, ...rest }: any) => {
  return (
    <Link
      {...rest}
      className="block px-4 py-2 text-sm text-gray-700 hover:text-[#3BAA75] hover:bg-gray-50 transition-colors"
    >
      {children}
    </Link>
  );
};

export const ProductMenu = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleAutoFinancingClick = async () => {
    if (!user) {
      navigate('/get-approved');
      return;
    }

    try {
      const { data: application } = await supabase
        .from('applications')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (application) {
        navigate('/dashboard');
      } else {
        navigate('/get-approved');
      }
    } catch (error) {
      console.error('Error checking application:', error);
      navigate('/get-approved');
    }
  };

  return (
    <div className="grid grid-cols-2 gap-4 p-2">
      <ProductItem
        title="Auto Financing"
        description="Get pre-approved in minutes"
        onClick={handleAutoFinancingClick}
        icon={<Car className="h-5 w-5 text-[#3BAA75]" />}
      />
      <ProductItem
        title="Payment Calculator"
        description="Estimate your payments"
        onClick={() => navigate('/calculator')}
        icon={<Calculator className="h-5 w-5 text-[#3BAA75]" />}
      />
    </div>
  );
};