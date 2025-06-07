import { z } from 'zod';

const MAKE_ENDPOINTS = {
  submitApplication: 'https://hook.us2.make.com/mcp1vldmdo6by27pepjuwe1octgvf7iy',
  uploadDocument: 'https://hook.us2.make.com/dw1c3e5v8d3m6m2cs6vv45yz6emlhhu6',
  contactForm: 'https://hook.us2.make.com/3r8kj9l2m5n6p7q8s9t1u2v3w4x5y6z7'
};

export const makeClient = {
  async submitApplication(data: any) {
    try {
      const response = await fetch(MAKE_ENDPOINTS.submitApplication, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          submissionDate: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to submit application');
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }

      const textResponse = await response.text();
      return { status: textResponse };
    } catch (error) {
      console.error('Error submitting application:', error);
      throw error;
    }
  },

  async uploadDocument(data: any) {
    try {
      const response = await fetch(MAKE_ENDPOINTS.uploadDocument, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          uploadDate: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to upload document');
      }

      return await response.json();
    } catch (error) {
      console.error('Error uploading document:', error);
      throw error;
    }
  },

  async submitContactForm(data: any) {
    try {
      const response = await fetch(MAKE_ENDPOINTS.contactForm, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          submissionDate: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to submit contact form');
      }

      return await response.json();
    } catch (error) {
      console.error('Error submitting contact form:', error);
      throw error;
    }
  }
};