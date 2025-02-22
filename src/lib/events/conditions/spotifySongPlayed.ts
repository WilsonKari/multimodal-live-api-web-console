export const spotifySongPlayedSchema = {
  artistName: {
    type: 'string',
    label: 'Artist Name',
    description: 'Only show songs by this artist.',
  },
  songName: {
    type: 'string',
    label: 'Song Name',
    description: 'Only show songs with this name.',
  },
};
