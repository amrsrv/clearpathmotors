import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, RefreshCw, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import toast from 'react-hot-toast';

const EditApplication = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [application, setApplication] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadApplication();
    }
  }, [id]);

  const loadApplication = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setApplication(data);
    } catch (error: any) {
      console.error('Error loading application:', error);
      setError(error.message || 'Failed to load application');
      toast.error('Failed to load application');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setApplication(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      setError(null);

      const { error } = await supabase
        .from('applications')
        .update(application)
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Application updated successfully');
      navigate(`/admin/applications/${id}`);
    } catch (error: any) {
      console.error('Error updating application:', error);
      setError(error.message || 'Failed to update application');
      toast.error('Failed to update application');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#3BAA75] border-t-transparent" />
      </div>
    );
  }

  if (error && !application) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Application</h2>
        <p className="text-gray-600 mb-6 text-center">{error}</p>
        <button
          onClick={() => navigate('/admin/applications')}
          className="px-4 py-2 bg-[#3BAA75] text-white rounded-lg hover:bg-[#2D8259] transition-colors"
        >
          Back to Applications
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Back Button */}
      <button
        onClick={() => navigate(`/admin/applications/${id}`)}
        className="flex items-center text-gray-600 hover:text-[#3BAA75] mb-6"
      >
        <ArrowLeft className="h-5 w-5 mr-2" />
        Back to Application
      </button>

      {/* Form Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Edit Application
        </h1>
        <p className="text-gray-600 mt-1">
          Application ID: {id?.substring(0, 8)}
        </p>
      </div>

      {/* Edit Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6">
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Personal Information */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Personal Information</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name
              </label>
              <input
                type="text"
                name="first_name"
                value={application.first_name || ''}
                onChange={handleChange}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name
              </label>
              <input
                type="text"
                name="last_name"
                value={application.last_name || ''}
                onChange={handleChange}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={application.email || ''}
                onChange={handleChange}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="tel"
                name="phone"
                value={application.phone || ''}
                onChange={handleChange}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <input
                type="text"
                name="address"
                value={application.address || ''}
                onChange={handleChange}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City
                </label>
                <input
                  type="text"
                  name="city"
                  value={application.city || ''}
                  onChange={handleChange}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Province
                </label>
                <input
                  type="text"
                  name="province"
                  value={application.province || ''}
                  onChange={handleChange}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Postal Code
              </label>
              <input
                type="text"
                name="postal_code"
                value={application.postal_code || ''}
                onChange={handleChange}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
              />
            </div>
          </div>
          
          {/* Financial Information */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Financial Information</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Employment Status
              </label>
              <select
                name="employment_status"
                value={application.employment_status || ''}
                onChange={handleChange}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
              >
                <option value="">Select Status</option>
                <option value="employed">Employed</option>
                <option value="self_employed">Self-Employed</option>
                <option value="unemployed">Unemployed</option>
                <option value="student">Student</option>
                <option value="retired">Retired</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Employer Name
              </label>
              <input
                type="text"
                name="employer_name"
                value={application.employer_name || ''}
                onChange={handleChange}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Annual Income
              </label>
              <input
                type="number"
                name="annual_income"
                value={application.annual_income || ''}
                onChange={handleChange}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Credit Score
              </label>
              <input
                type="number"
                name="credit_score"
                value={application.credit_score || ''}
                onChange={handleChange}
                min="300"
                max="900"
                className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Housing Status
              </label>
              <select
                name="housing_status"
                value={application.housing_status || ''}
                onChange={handleChange}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
              >
                <option value="">Select Status</option>
                <option value="own">Own</option>
                <option value="rent">Rent</option>
                <option value="live_with_parents">Live with Parents</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Housing Payment
              </label>
              <input
                type="number"
                name="housing_payment"
                value={application.housing_payment || ''}
                onChange={handleChange}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
              />
            </div>
          </div>
        </div>
        
        {/* Loan Information */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Loan Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vehicle Type
              </label>
              <input
                type="text"
                name="vehicle_type"
                value={application.vehicle_type || ''}
                onChange={handleChange}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Desired Monthly Payment
              </label>
              <input
                type="number"
                name="desired_monthly_payment"
                value={application.desired_monthly_payment || ''}
                onChange={handleChange}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Down Payment
              </label>
              <input
                type="number"
                name="down_payment_amount"
                value={application.down_payment_amount || ''}
                onChange={handleChange}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Loan Amount Min
              </label>
              <input
                type="number"
                name="loan_amount_min"
                value={application.loan_amount_min || ''}
                onChange={handleChange}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Loan Amount Max
              </label>
              <input
                type="number"
                name="loan_amount_max"
                value={application.loan_amount_max || ''}
                onChange={handleChange}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Interest Rate
              </label>
              <input
                type="number"
                name="interest_rate"
                value={application.interest_rate || ''}
                onChange={handleChange}
                step="0.01"
                className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
              />
            </div>
          </div>
        </div>
        
        {/* Application Status */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Application Status</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                name="status"
                value={application.status || ''}
                onChange={handleChange}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
              >
                <option value="submitted">Submitted</option>
                <option value="under_review">Under Review</option>
                <option value="pending_documents">Pending Documents</option>
                <option value="pre_approved">Pre-Approved</option>
                <option value="vehicle_selection">Vehicle Selection</option>
                <option value="final_approval">Final Approval</option>
                <option value="finalized">Finalized</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Stage
              </label>
              <select
                name="current_stage"
                value={application.current_stage || ''}
                onChange={handleChange}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
              >
                <option value="1">Stage 1</option>
                <option value="2">Stage 2</option>
                <option value="3">Stage 3</option>
                <option value="4">Stage 4</option>
                <option value="5">Stage 5</option>
                <option value="6">Stage 6</option>
                <option value="7">Stage 7</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* Notes */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Internal Notes
          </label>
          <textarea
            name="internal_notes"
            value={application.internal_notes || ''}
            onChange={handleChange}
            rows={4}
            className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#3BAA75] focus:border-[#3BAA75]"
          />
        </div>
        
        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-[#3BAA75] text-white rounded-lg hover:bg-[#2D8259] transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <RefreshCw className="h-5 w-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditApplication;