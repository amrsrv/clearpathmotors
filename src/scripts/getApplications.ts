import { supabase } from '../lib/supabaseClient';

async function fetchApplications() {
  try {
    const { data: applications, error } = await supabase
      .from('applications')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    console.log('Total applications found:', applications.length);
    console.log('\nApplication details:');
    applications.forEach((app, index) => {
      console.log(`\nApplication #${index + 1}:`);
      console.log('ID:', app.id);
      console.log('Name:', `${app.first_name} ${app.last_name}`);
      console.log('Email:', app.email);
      console.log('Phone:', app.phone);
      console.log('Status:', app.status);
      console.log('Created:', new Date(app.created_at).toLocaleString());
      console.log('Vehicle Type:', app.vehicle_type);
      console.log('Loan Amount Range:', `$${app.loan_amount_min} - $${app.loan_amount_max}`);
      console.log('Monthly Payment:', `$${app.desired_monthly_payment}`);
      console.log('Credit Score:', app.credit_score);
      console.log('Employment:', app.employment_status);
      console.log('Annual Income:', `$${app.annual_income}`);
      console.log('----------------------------------------');
    });

  } catch (error) {
    console.error('Error fetching applications:', error);
  }
}

fetchApplications();