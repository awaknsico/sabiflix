/**
 * Typed mock data for the SabiFlix prototype.
 *
 * These types mirror the Drizzle schema in `lib/db/schema.ts`. No database is
 * provisioned — this data drives the entire UI so it behaves like a real app.
 * YouTube video IDs below are freely embeddable placeholders.
 */

export type MovieCategory = 'feature' | 'short' | 'documentary'
export type SubmissionStatus = 'pending' | 'approved' | 'rejected'
export type RequestStatus = 'open' | 'found' | 'closed'

export const CATEGORIES: { value: MovieCategory; label: string }[] = [
  { value: 'feature', label: 'Feature' },
  { value: 'short', label: 'Short' },
  { value: 'documentary', label: 'Documentary' },
]

export const COUNTRIES = [
  'Nigeria',
  'Ghana',
  'South Africa',
  'Kenya',
  'Tanzania',
  'Senegal',
] as const

export const LANGUAGES = ['English', 'Yoruba', 'Igbo', 'Swahili', 'Hausa', 'Zulu'] as const

export interface Movie {
  id: string
  title: string
  alternativeTitles: string[]
  /** Lead actors — up to 2 shown on the card, full list available on the film page. */
  actors: string[]
  year: number
  country: string
  language: string
  category: MovieCategory
  synopsis: string
  posterUrl: string
  isActive: boolean
  /**
   * Provenance badge shown on the card.
   * - 'admin'      → gold Curator's Mark (personally screened by a moderator)
   * - 'requested'  → cyan Community Mark (added because users asked for it)
   * - 'filmmaker'  → green Filmmaker Mark (submitted directly by the creator)
   * - undefined    → no badge (standard catalog entry)
   */
  curationType?: 'admin' | 'requested' | 'filmmaker'
  createdAt: string
  updatedAt: string
}

export interface MovieSource {
  id: string
  movieId: string
  youtubeVideoId: string
  youtubeChannelName: string
  partNumber: number
  isPrimary: boolean
  quality: string
  /**
   * Seek-in point (seconds) for the film page's cinematic preview — the muted
   * ambient loop and the "Play preview" snippet both start here. Optional:
   * when absent the film page falls back to the calm static poster treatment.
   */
  previewStartSeconds?: number
}

export interface Playlist {
  id: string
  name: string
  description: string
  isFeatured: boolean
  movieIds: string[]
}

export interface WatchHistoryEntry {
  id: string
  movieId: string
  watchedAt: string
  progressSeconds: number
  durationSeconds: number
  /** Set once the viewer has finished (completion / mark-as-finished). */
  completedAt?: string | null
  /** Last playback activity — drives resume order and "watched this week". */
  updatedAt?: string
}

export interface FilmSubmission {
  id: string
  userDisplayName: string
  title: string
  youtubeUrl: string
  youtubeVideoId: string
  description: string
  status: SubmissionStatus
  adminNotes: string | null
  submittedAt: string
  /** Auto-fetched poster candidates when the URL was resolved on submit. */
  thumbnailUrl?: string
  /** Set when the moderator has published this film into the catalog. */
  publishedMovieId?: string
}

export interface FilmRequest {
  id: string
  userDisplayName: string
  requestedTitle: string
  requestedAt: string
  status: RequestStatus
}

/* ------------------------------------------------------------------ */
/* Movies                                                              */
/* ------------------------------------------------------------------ */

export const movies: Movie[] = [
  {
    id: 'mov-lagos-nights',
    title: 'Lagos Nights',
    alternativeTitles: ['Eko Nights'],
    actors: ['Mike Omoregbe', 'Amara Nwachukwu', 'Tunde Salami'],
    year: 2023,
    country: 'Nigeria',
    language: 'English',
    category: 'feature',
    synopsis:
      'A weary taxi driver navigates one unforgettable night across Lagos, colliding with strangers whose stories reshape his understanding of home, ambition, and forgiveness.',
    posterUrl: '/posters/lagos-nights.png',
    isActive: true,
    curationType: 'admin',
    createdAt: '2024-11-02T10:00:00Z',
    updatedAt: '2024-11-02T10:00:00Z',
  },
  {
    id: 'mov-herdsmans-daughter',
    title: "The Herdsman's Daughter",
    alternativeTitles: ['Omo Darandaran'],
    actors: ['Bimbo Ademoye', 'Femi Adebayo'],
    year: 2022,
    country: 'Nigeria',
    language: 'Yoruba',
    category: 'feature',
    synopsis:
      'In a drought-stricken village, a young woman defies tradition to lead her family herd to safety, discovering her own voice against the vast Yoruba savanna.',
    posterUrl: '/posters/herdsmans-daughter.png',
    isActive: true,
    curationType: 'admin',
    createdAt: '2024-10-18T10:00:00Z',
    updatedAt: '2024-10-18T10:00:00Z',
  },
  {
    id: 'mov-sun-of-the-soil',
    title: 'Sun of the Soil',
    alternativeTitles: [],
    actors: ['Yaa Owusu', 'Kwame Asante'],
    year: 2021,
    country: 'Ghana',
    language: 'English',
    category: 'documentary',
    synopsis:
      'An intimate documentary tracing the legacy of West African gold, the artisans who mine it, and the communities holding on to ancestral craft.',
    posterUrl: '/posters/sun-of-the-soil.png',
    isActive: true,
    curationType: 'requested',
    createdAt: '2024-09-30T10:00:00Z',
    updatedAt: '2024-09-30T10:00:00Z',
  },
  {
    id: 'mov-market-street',
    title: 'Market Street',
    alternativeTitles: [],
    actors: ['Adjetey Anang', 'Nana Mensah'],
    year: 2024,
    country: 'Ghana',
    language: 'English',
    category: 'short',
    synopsis:
      'A tender fifteen-minute portrait of a Makola market trader and the customers who become family over the course of a single rainy afternoon.',
    posterUrl: '/posters/market-street.png',
    isActive: true,
    createdAt: '2025-01-12T10:00:00Z',
    updatedAt: '2025-01-12T10:00:00Z',
  },
  {
    id: 'mov-ubuntu',
    title: 'Ubuntu',
    alternativeTitles: ['I Am Because We Are'],
    actors: ['Thuso Mbedu', 'Sello Maake'],
    year: 2023,
    country: 'South Africa',
    language: 'Zulu',
    category: 'feature',
    synopsis:
      'After a factory closure divides a township, three neighbours must relearn what it means to belong to one another in this warm, sweeping drama.',
    posterUrl: '/posters/ubuntu.png',
    isActive: true,
    curationType: 'filmmaker',
    createdAt: '2024-12-05T10:00:00Z',
    updatedAt: '2024-12-05T10:00:00Z',
  },
  {
    id: 'mov-city-of-gold',
    title: 'City of Gold',
    alternativeTitles: ['Jiji la Dhahabu'],
    actors: ['Joseph Wairimu', 'Nice Githinji'],
    year: 2022,
    country: 'Kenya',
    language: 'Swahili',
    category: 'feature',
    synopsis:
      'A small-time hustler in Nairobi is pulled into a dangerous scheme that promises to change his life — if it does not end it first.',
    posterUrl: '/posters/city-of-gold.png',
    isActive: true,
    curationType: 'admin',
    createdAt: '2024-08-21T10:00:00Z',
    updatedAt: '2024-08-21T10:00:00Z',
  },
  {
    id: 'mov-the-talking-drum',
    title: 'The Talking Drum',
    alternativeTitles: ['Dùndún'],
    actors: ['Wale Ojo', 'Tobi Bakre'],
    year: 2024,
    country: 'Nigeria',
    language: 'Yoruba',
    category: 'short',
    synopsis:
      'A grandfather teaches his reluctant grandson the ancient language of the dùndún drum, and a family memory is passed to the next generation.',
    posterUrl: '/posters/the-talking-drum.png',
    isActive: true,
    curationType: 'requested',
    createdAt: '2025-02-01T10:00:00Z',
    updatedAt: '2025-02-01T10:00:00Z',
  },
  {
    id: 'mov-serengeti-dawn',
    title: 'Serengeti Dawn',
    alternativeTitles: [],
    actors: ['Juma Nathaniel', 'Fatima Juma'],
    year: 2020,
    country: 'Tanzania',
    language: 'Swahili',
    category: 'documentary',
    synopsis:
      'Following the great migration across the Serengeti, this documentary captures the fragile rhythm between wildlife, land, and the people who protect it.',
    posterUrl: '/posters/serengeti-dawn.png',
    isActive: false,
    createdAt: '2024-07-14T10:00:00Z',
    updatedAt: '2024-07-14T10:00:00Z',
  },
  {
    id: 'mov-accra-blue',
    title: 'Accra Blue',
    alternativeTitles: [],
    actors: ['Jimmy Odukoya', 'Ama K. Abebrese'],
    year: 2023,
    country: 'Ghana',
    language: 'English',
    category: 'feature',
    synopsis:
      'Two childhood friends reunite one summer in Accra and confront the futures they promised each other, in a bittersweet coming-of-age romance.',
    posterUrl: '/posters/accra-blue.png',
    isActive: true,
    curationType: 'filmmaker',
    createdAt: '2024-10-01T10:00:00Z',
    updatedAt: '2024-10-01T10:00:00Z',
  },
  {
    id: 'mov-diamonds-in-the-dust',
    title: 'Diamonds in the Dust',
    alternativeTitles: [],
    actors: ['Presley Chweneyagae', 'Terry Pheto'],
    year: 2021,
    country: 'South Africa',
    language: 'English',
    category: 'feature',
    synopsis:
      'A family saga spanning three generations of a mining town, where buried secrets surface as the mine that built them begins to close.',
    posterUrl: '/posters/diamonds-in-the-dust.png',
    isActive: true,
    createdAt: '2024-06-19T10:00:00Z',
    updatedAt: '2024-06-19T10:00:00Z',
  },
]

/* Cast/actor index for search-by-actor (mock). Includes all actors for comprehensive search. */
export const movieCast: Record<string, string[]> = {
  'mov-lagos-nights': ['Mike Omoregbe', 'Amara Nwachukwu', 'Tunde Salami', 'Gideon Okeke', 'Rita Dominic'],
  'mov-herdsmans-daughter': ['Bimbo Ademoye', 'Femi Adebayo'],
  'mov-sun-of-the-soil': ['Yaa Owusu', 'Kwame Asante'],
  'mov-market-street': ['Adjetey Anang', 'Nana Mensah'],
  'mov-ubuntu': ['Thuso Mbedu', 'Sello Maake'],
  'mov-city-of-gold': ['Joseph Wairimu', 'Nice Githinji'],
  'mov-the-talking-drum': ['Wale Ojo', 'Tobi Bakre'],
  'mov-serengeti-dawn': ['Juma Nathaniel', 'Fatima Juma'],
  'mov-accra-blue': ['Jimmy Odukoya', 'Ama K. Abebrese'],
  'mov-diamonds-in-the-dust': ['Presley Chweneyagae', 'Terry Pheto'],
}

/* ------------------------------------------------------------------ */
/* Movie sources (YouTube)                                             */
/* ------------------------------------------------------------------ */

const PLACEHOLDER_VIDEO_IDS = [
  'aqz-KE-bpKQ',
  'YE7VzlLtp-4',
  'eRsGyueVLvQ',
  'LXb3EKWsInQ',
]

export const movieSources: MovieSource[] = movies.map((m, i) => ({
  id: `src-${m.id}`,
  movieId: m.id,
  youtubeVideoId: PLACEHOLDER_VIDEO_IDS[i % PLACEHOLDER_VIDEO_IDS.length],
  youtubeChannelName: 'SabiFlix Curated',
  partNumber: 1,
  isPrimary: true,
  quality: '1080p',
  /* Placeholder preview windows that rotate per title. When real key moments
     are curated per film, this is the single value to update. */
  previewStartSeconds: 20 + ((i * 37) % 260),
}))

export function getMovieById(id: string): Movie | undefined {
  return movies.find((m) => m.id === id)
}

export function getPrimarySource(movieId: string): MovieSource | undefined {
  return movieSources.find((s) => s.movieId === movieId && s.isPrimary)
}

/* ------------------------------------------------------------------ */
/* Playlists                                                           */
/* ------------------------------------------------------------------ */

export const playlists: Playlist[] = [
  {
    id: 'pl-editors-picks',
    name: "Curator's Picks",
    description: 'Hand-selected standouts from across the continent.',
    isFeatured: true,
    movieIds: ['mov-lagos-nights', 'mov-ubuntu', 'mov-city-of-gold', 'mov-accra-blue'],
  },
  {
    id: 'pl-nollywood-essentials',
    name: 'Nollywood Essentials',
    description: 'The Nigerian films every collection needs.',
    isFeatured: true,
    movieIds: [
      'mov-lagos-nights',
      'mov-herdsmans-daughter',
      'mov-the-talking-drum',
    ],
  },
  {
    id: 'pl-true-stories',
    name: 'True Stories',
    description: 'Documentaries that stay with you.',
    isFeatured: true,
    movieIds: ['mov-sun-of-the-soil', 'mov-serengeti-dawn'],
  },
  {
    id: 'pl-short-and-sweet',
    name: 'Short & Sweet',
    description: 'Big feelings in under thirty minutes.',
    isFeatured: true,
    movieIds: ['mov-market-street', 'mov-the-talking-drum'],
  },
]

export function getPlaylistMovies(playlist: Playlist): Movie[] {
  return playlist.movieIds
    .map((id) => getMovieById(id))
    .filter((m): m is Movie => Boolean(m))
}

/* ------------------------------------------------------------------ */
/* User dashboard data                                                 */
/* ------------------------------------------------------------------ */

export const watchHistory: WatchHistoryEntry[] = [
  {
    id: 'wh-1',
    movieId: 'mov-city-of-gold',
    watchedAt: '2025-02-20T21:14:00Z',
    progressSeconds: 3120,
    durationSeconds: 5820,
  },
  {
    id: 'wh-2',
    movieId: 'mov-ubuntu',
    watchedAt: '2025-02-18T19:02:00Z',
    progressSeconds: 6600,
    durationSeconds: 6600,
  },
  {
    id: 'wh-3',
    movieId: 'mov-market-street',
    watchedAt: '2025-02-15T13:40:00Z',
    progressSeconds: 900,
    durationSeconds: 900,
  },
  {
    id: 'wh-4',
    movieId: 'mov-lagos-nights',
    watchedAt: '2025-02-11T22:30:00Z',
    progressSeconds: 1500,
    durationSeconds: 6000,
  },
]

export const favoriteMovieIds: string[] = [
  'mov-lagos-nights',
  'mov-accra-blue',
  'mov-sun-of-the-soil',
  'mov-the-talking-drum',
]

export const filmSubmissions: FilmSubmission[] = [
  {
    id: 'sub-1',
    userDisplayName: 'Chidi Okonkwo',
    title: 'The Last Bus to Enugu',
    youtubeUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
    youtubeVideoId: 'aqz-KE-bpKQ',
    description:
      'A self-funded road drama shot across eastern Nigeria over three years. Igbo with English subtitles.',
    status: 'pending',
    adminNotes: null,
    submittedAt: '2025-02-19T08:22:00Z',
  },
  {
    id: 'sub-2',
    userDisplayName: 'Amara Nwosu',
    title: 'Harmattan',
    youtubeUrl: 'https://www.youtube.com/watch?v=YE7VzlLtp-4',
    youtubeVideoId: 'YE7VzlLtp-4',
    description: 'A short film about a photographer returning to her hometown in the dry season.',
    status: 'pending',
    adminNotes: null,
    submittedAt: '2025-02-17T15:05:00Z',
  },
  {
    id: 'sub-3',
    userDisplayName: 'Kwame Mensah',
    title: 'Cocoa',
    youtubeUrl: 'https://www.youtube.com/watch?v=eRsGyueVLvQ',
    youtubeVideoId: 'eRsGyueVLvQ',
    description: 'Documentary on Ghanaian cocoa farmers and fair trade.',
    status: 'approved',
    adminNotes: 'Great quality. Added to True Stories playlist.',
    submittedAt: '2025-02-08T11:00:00Z',
  },
  {
    id: 'sub-4',
    userDisplayName: 'Zanele Dube',
    title: 'Neon Township',
    youtubeUrl: 'https://www.youtube.com/watch?v=LXb3EKWsInQ',
    youtubeVideoId: 'LXb3EKWsInQ',
    description: 'Experimental sci-fi short set in a future Johannesburg.',
    status: 'rejected',
    adminNotes: 'Audio mix needs work — encouraged resubmission.',
    submittedAt: '2025-01-29T09:30:00Z',
  },
]

export const filmRequests: FilmRequest[] = [
  {
    id: 'req-1',
    userDisplayName: 'Tunde Bakare',
    requestedTitle: 'Living in Bondage (1992)',
    requestedAt: '2025-02-21T10:00:00Z',
    status: 'open',
  },
  {
    id: 'req-2',
    userDisplayName: 'Fatima Sow',
    requestedTitle: 'Touki Bouki',
    requestedAt: '2025-02-16T14:20:00Z',
    status: 'open',
  },
  {
    id: 'req-3',
    userDisplayName: 'Grace Achieng',
    requestedTitle: 'Nairobi Half Life',
    requestedAt: '2025-02-10T18:45:00Z',
    status: 'found',
  },
]

/* Current mock user for the prototype header/profile. */
export const mockUser = {
  id: 'user-demo',
  email: 'demo@sabiflix.africa',
  displayName: 'Ada Eze',
  initials: 'AE',
  isAdmin: true,
}
