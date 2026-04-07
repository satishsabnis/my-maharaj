export interface CuisineGroup {
  label: string;
  cuisines: string[];
}

/**
 * Returns cuisine groups for chip display.
 * Jain group shown only when isJain is true.
 * Identical order used in both Family Profile and Meal Wizard.
 */
export function getCuisineGroups(isJain: boolean = false): CuisineGroup[] {
  const groups: CuisineGroup[] = [
    { label: 'EAST INDIA', cuisines: ['Bengali', 'Odia', 'Bihari', 'Assamese'] },
    { label: 'WEST INDIA', cuisines: ['Maharashtrian', 'Gujarati', 'Rajasthani', 'Goan', 'Malvani', 'Konkani', 'Parsi'] },
    { label: 'NORTH INDIA', cuisines: ['Punjabi', 'Delhi', 'Mughlai', 'Awadhi', 'Lucknowi', 'Kashmiri', 'Sindhi'] },
    { label: 'SOUTH INDIA', cuisines: ['Tamil Nadu', 'Kerala', 'Karnataka', 'Andhra Pradesh', 'Telangana', 'Chettinad', 'Mangalorean'] },
    { label: 'STREET FOOD', cuisines: ['Delhi Street', 'Mumbai Street', 'Indo-Chinese', 'Kolkata Chinese'] },
  ];
  if (isJain) {
    groups.push({ label: 'JAIN', cuisines: ['Jain'] });
  }
  return groups;
}

/**
 * Flat list of all cuisine names.
 */
export function getAllCuisines(isJain: boolean = false): string[] {
  return getCuisineGroups(isJain).flatMap(g => g.cuisines);
}
