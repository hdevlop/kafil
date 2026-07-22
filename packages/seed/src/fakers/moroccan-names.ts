import { faker } from "@faker-js/faker";

export type MoroccanNameGender = "F" | "M";

export interface MoroccanNameParts {
  firstName: string;
  fullName: string;
  lastName: string;
  middleName?: string;
}

export const MOROCCAN_FEMALE_FIRST_NAMES = [
  "Aicha", "Ahlam", "Alae", "Amal", "Amina", "Amira", "Asmae", "Assia",
  "Aya", "Bahia", "Basma", "Batoul", "Bouchra", "Chadia", "Chaimae",
  "Dalila", "Dounia", "Fadwa", "Fatiha", "Fatima", "Fatna", "Fettouma",
  "Firdaous", "Ghita", "Habiba", "Hafida", "Hafsa", "Hajar", "Hakima",
  "Hanae", "Hasna", "Hayat", "Hind", "Hlima", "Houda", "Ibtihal",
  "Ibtissam", "Ihssane", "Ikram", "Ilham", "Imane", "Ines", "Jamila",
  "Jihane", "Karima", "Kawtar", "Kenza", "Khadija", "Lamiae", "Latifa",
  "Leila", "Lina", "Loubna", "Lubna", "Maha", "Majda", "Malak", "Manal",
  "Manel", "Marwa", "Maryam", "Mbarka", "Meryem", "Mouna", "Mounia",
  "Nada", "Nadia", "Naima", "Najat", "Najwa", "Nassima", "Nawal",
  "Nezha", "Nisrine", "Nouhaila", "Oumaima", "Ouafae", "Rabha",
  "Rachida", "Rahma", "Rajae", "Rania", "Rim", "Rkia", "Sabah", "Safae",
  "Saida", "Sakinah", "Salma", "Samia", "Samira", "Sana", "Sanae",
  "Sara", "Selma", "Siham", "Souad", "Soukaina", "Soumaya", "Touriya",
  "Wafae", "Warda", "Wiam", "Wissal", "Yasmine", "Yousra", "Zahra",
  "Zakia", "Zaineb", "Zhor", "Zineb", "Zohra",
] as const;

export const MOROCCAN_MALE_FIRST_NAMES = [
  "Abdelali", "Abdelghani", "Abdelhadi", "Abdelhak", "Abdelilah",
  "Abdelkabir", "Abdelkarim", "Abdelkhalek", "Abdellah", "Abdellatif",
  "Abdelmajid", "Abdelmalek", "Abdelouahed", "Abdelaziz", "Abdennour", "Abderrahim",
  "Abderrahman", "Abderrahmane", "Abderrazak", "Abdeslam", "Abdessamad",
  "Achraf", "Adil", "Adnane", "Ahmed", "Ali", "Allal", "Amine", "Anas",
  "Aomar", "Aymane", "Ayoub", "Aziz", "Badr", "Bilal", "Bouchaib", "Boujamaa",
  "Brahim", "Chakib", "Driss", "Fahd", "Faical", "Fouad", "Haddou",
  "Hafid", "Hakim", "Hamid", "Hamza", "Hassan", "Hatim", "Hicham", "Houcine",
  "Houssine", "Ibrahim", "Ilyas", "Imad", "Ismail", "Issam", "Jalal", "Jamal",
  "Jawad", "Kamal", "Karim", "Khalid", "Lahcen", "Lotfi", "Mahdi",
  "Mansour", "Marouane", "Mbarek", "Mehdi", "Miloud", "Mohamed", "Mohcine",
  "Mohssine", "Mokhtar", "Moncef", "Mostafa", "Mouad", "Mounir", "Mourad",
  "Mustapha", "Nabil", "Nadir", "Najib", "Nasreddine", "Noureddine",
  "Omar", "Othmane", "Otman", "Oussama", "Rachid", "Rafik", "Reda",
  "Rida", "Saad", "Said", "Salaheddine", "Samir", "Sidi", "Soufiane",
  "Souleimane", "Taoufik", "Tarik", "Walid", "Yahya", "Yassine", "Younes",
  "Youssef", "Zakaria", "Zayd", "Zouhair",
] as const;

export const MOROCCAN_LAST_NAMES = [
  "Ababou", "Aarab", "Achehboun", "Afilal", "Ajouli", "Akhannouch", "Alami",
  "Alaoui", "Amazigh", "Amhal", "Amrani", "Aniba", "Aouragh", "Ayouch",
  "Azzouzi", "Baalla", "Badaoui", "Bahraoui", "Bakkali", "Baraket", "Belhaj",
  "Belkadi", "Bellaoui", "Benabdellah", "Benali", "Benamour", "Benarafa",
  "Benbrahim", "Bencharki", "Benchekroun", "Benchrifa", "Bendriss", "Benhima",
  "Benjelloun", "Benkirane", "Benmansour", "Benmoussa", "Bennis", "Bennani",
  "Benomar", "Benrahal", "Bensaid", "Benslimane", "Bentaher", "Benyahia",
  "Benzine", "Berrada", "Binebine", "Bouabid", "Bouanani", "Bouazza",
  "Boudrika", "Boukili", "Bounou", "Boussaid", "Boutayeb", "Bouzid",
  "Chafai", "Chafik", "Chami", "Chaoui", "Chebli", "Cherkaoui", "Choukri",
  "Chraibi", "Dahbi", "Daoudi", "Diouri", "Dlimi", "Douiri", "El Aissaoui",
  "El Alami", "El Alaoui", "El Amrani", "El Ansari", "El Asri", "El Baghdadi",
  "El Bakkali", "El Baz", "El Bekri", "El Boukhari", "El Fassi", "El Filali",
  "El Gharbi", "El Guerrouj", "El Habib", "El Haddad", "El Hadri", "El Haj",
  "El Hajji", "El Hamdaoui", "El Hamidi", "El Hariri", "El Harti",
  "El Hassani", "El Idrissi", "El Kabbaj", "El Khalfi", "El Khatib",
  "El Loukili", "El Maati", "El Maghraoui", "El Mahdaoui", "El Malki",
  "El Mansouri", "El Mekki", "El Mernissi", "El Mokhtar", "El Moudden",
  "El Moussaoui", "El Othmani", "El Ouafi", "El Rhazi", "El Rifai",
  "El Yacoubi", "El Yazghi", "El Yousfi", "Elmrini", "Ennaji", "Erradi",
  "Essafi", "Eziani", "Faik", "Faraj", "Farhat", "Fassi", "Fekkak", "Fikri",
  "Filali", "Ghallab", "Ghanmi", "Gharbi", "Guessous", "Habti", "Hachimi",
  "Hamdouchi", "Harrak", "Hassouni", "Houari", "Ibrahimi", "Idrissi",
  "Iraqi", "Jabrane", "Jabri", "Jazouli", "Jouahri", "Kabbaj", "Kadiri",
  "Kettani", "Khalfi", "Khattabi", "Kouzi", "Laarichi", "Laaroussi",
  "Lahlou", "Lamrabet", "Lamrani", "Lazaar", "Lazrak", "Mahfoud", "Majidi",
  "Mansouri", "Marrakchi", "Masrour", "Mehdaoui", "Mellah", "Mernissi",
  "Meziane", "Mouline", "Mrabet", "Mrani", "Naciri", "Naji", "Najjar",
  "Nasri", "Ouahbi", "Ouakrim", "Ouardi", "Ouazzani", "Ouchen", "Oufkir",
  "Oulhaj", "Oumlil", "Qadiri", "Qasmi", "Rafii", "Rahmani", "Raji",
  "Rami", "Razine", "Rebbahi", "Regragui", "Rhali", "Rizki", "Sabri",
  "Saidi", "Sekkat", "Senhaji", "Skalli", "Slaoui", "Slimani", "Soussi",
  "Sqalli", "Tahiri", "Tamim", "Tamou", "Tazi", "Tebaa", "Tijani",
  "Tlemcani", "Touzani", "Wakrim", "Yacoubi", "Youssoufi", "Zaidi", "Zaim",
  "Zaoui", "Zaroual", "Zefzafi", "Zerhouni", "Ziani", "Zitouni", "Zniber",
  "Zoubir",
] as const;

export function moroccanFirstName(gender?: MoroccanNameGender) {
  const resolvedGender = gender ?? (faker.datatype.boolean() ? "F" : "M");
  return faker.helpers.arrayElement(
    resolvedGender === "F"
      ? MOROCCAN_FEMALE_FIRST_NAMES
      : MOROCCAN_MALE_FIRST_NAMES,
  );
}

export function moroccanLastName() {
  return faker.helpers.arrayElement(MOROCCAN_LAST_NAMES);
}

export function moroccanFullName(gender?: MoroccanNameGender) {
  return moroccanNameParts(gender).fullName;
}

export function moroccanNameParts(
  gender?: MoroccanNameGender,
): MoroccanNameParts {
  const resolvedGender = gender ?? (faker.datatype.boolean() ? "F" : "M");
  const firstName = moroccanFirstName(resolvedGender);
  const middleName = faker.helpers.maybe(
    () => moroccanFirstName(resolvedGender),
    { probability: 0.35 },
  );

  const lastName = moroccanLastName();

  return {
    firstName,
    fullName: [firstName, middleName, lastName].filter(Boolean).join(" "),
    lastName,
    ...(middleName ? { middleName } : {}),
  };
}
