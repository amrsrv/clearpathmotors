{/* File content updated to use makeClient */}
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!formData.name || !formData.email || !formData.message || !formData.phone) {
    setError('Please fill in all required fields');
    return;
  }

  try {
    await makeClient.submitContactForm(formData);
    setSubmitted(true);
    setError('');
    setFormData({
      name: '',
      email: '',
      phone: '',
      subject: 'General Inquiry',
      message: '',
      preferredContact: 'email',
      bestTime: 'morning',
      formName: 'contact_form'
    });
  } catch (error) {
    setError('There was an error submitting your message. Please try again.');
  }
};

export default handleSubmit