import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import TownPage from '../../components/TownPage';

// List of valid towns for validation
const validTowns = [
  'Toronto', 'North York', 'Scarborough', 'Etobicoke', 'York', 'East York',
  'Downtown Toronto', 'Midtown Toronto', 'Old Toronto', 'Mississauga', 'Brampton',
  'Caledon', 'Vaughan', 'Woodbridge', 'Richmond Hill', 'Markham', 'Thornhill',
  'Maple', 'King City', 'Aurora', 'Newmarket', 'Stouffville', 'Georgina',
  'Oakville', 'Burlington', 'Milton', 'Halton Hills', 'Georgetown', 'Acton',
  'Pickering', 'Ajax', 'Whitby', 'Oshawa', 'Clarington', 'Bowmanville',
  'Courtice', 'Uxbridge', 'Port Perry'
].map(town => town.toLowerCase().replace(/\s+/g, '-'));

const LocationPage = () => {
  const { town } = useParams();
  
  // Validate town exists in our list
  if (!town || !validTowns.includes(town)) {
    return <Navigate to="/" replace />;
  }

  // Convert URL format back to display format
  const displayTown = town
    .replace(/-/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return <TownPage townName={displayTown} />;
};

export default LocationPage;