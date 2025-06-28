import { z } from 'zod';

const MAKE_ENDPOINTS = {
  uploadDocument: 'https://hook.us1.make.com/y4pmc2ojk78pfewwhiu2dedne0z4d0xk',
  contactForm: 'https://hook.us2.make.com/3r8kj9l2m5n6p7q8s9t1u2v3w4x5y6z7'
};

export const makeClient = {
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