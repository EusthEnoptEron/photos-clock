declare module 'google-photos' {

    interface SharedAlbumOptions {
        /**
         * True if the shared album allows collaborators (users who have joined the album) to add media items to it. Defaults to false.
         */
        isCollaborative: boolean,

        /**
         * True if the shared album allows collaborators (users who have joined the album) to add comments to the album. Defaults to false.
         */
        isCommentable: boolean
    }

    interface ShareInfo {
        /**
         * Options that control whether someone can add media items to, or comment on a shared album.
         */
        sharedAlbumOptions: SharedAlbumOptions,

        /**
         * A link to the shared Google Photos album. Anyone with the link can view the contents of the album, so it should be treated with care.
         * 
         * The shareableUrl parameter is only returned if the album has link sharing turned on. If a user is already joined to an album that isn't link-shared, they can use the album's productUrl to access it instead.
         * 
         * A shareableUrl is invalidated if the owner turns off link sharing in the Google Photos app, or if the album is unshared.
         */
        shareableUrl?: string,

        /**
         * A token that is used to join, leave, or retrieve the details of a shared album on behalf of a user who isn't the owner.
         * 
         * A shareToken is invalidated if the owner turns off link sharing in the Google Photos app, or if the album is unshared.
         */
        shareToken: string,

        /**
         * True if the user is joined to the album. This is always true for the owner of the album.
         */
        isJoined: boolean,
        /**
         * True if the user owns the album.
         */
        isOwned: boolean,
        /**
         * True if the album can be joined by users.
         */
        isJoinable: boolean
    }

    interface Album {
        /**
         * Identifier for the album. This is a persistent identifier that can be used between sessions to identify this album.
         */
        id: string,

        /**
         * Name of the album displayed to the user in their Google Photos account. This string shouldn't be more than 500 characters.
         */
        title: string,

        /**
         * [Output only] Google Photos URL for the album. The user needs to be signed in to their Google Photos account to access this link.
         */
        productUrl?: string,

        /**
         * [Output only] True if you can create media items in this album. This field is based on the scopes granted and permissions of the album. If the scopes are changed or permissions of the album are changed, this field is updated.
         */
        isWriteable?: boolean,

        /**
         * [Output only] Information related to shared albums. This field is only populated if the album is a shared album, the developer created the album and the user has granted the photoslibrary.sharing scope.
         */
        shareInfo?: ShareInfo,

        /**
         * [Output only] The number of media items in the album.
         */
        mediaItemsCount?: string,

        /**
         * [Output only] A URL to the cover photo's bytes. This shouldn't be used as is. Parameters should be appended to this URL before use. See the developer documentation for a complete list of supported parameters. For example, '=w2048-h1024' sets the dimensions of the cover photo to have a width of 2048 px and height of 1024 px.
         */
        coverPhotoBaseUrl?: string,

        /**
         * Identifier for the media item associated with the cover photo.
         */
        coverPhotoMediaItemId: string
    }


    interface AlbumList {
        /**
         * Output only. List of albums shown in the Albums tab of the user's Google Photos app.
         */
        albums: Album[],

        /**
         * Output only. Token to use to get the next set of albums. Populated if there are more albums to retrieve for this request.
         */
        nextPageToken?: string
    }

    enum VideoProcessingStatus {
        UNSPECIFIED,
        PROCESSING,
        READY,
        FAILED
    }

    interface MediaMetadata {
        /**
         * Time when the media item was first created (not when it was uploaded to Google Photos). 
         * 
         * A timestamp in RFC3339 UTC "Zulu" format, with nanosecond resolution and up to nine fractional digits. Examples: "2014-10-02T15:01:23Z" and "2014-10-02T15:01:23.045123456Z".
         */
        creationTime: string,

        /**
         * Original width (in pixels) of the media item.
         */
        width: string,
        
        /**
         * Original height (in pixels) of the media item.
         */
        height: string,
        
        // Union field metadata can be only one of the following:
        photo?: {
            /**
             * Brand of the camera with which the photo was taken.
             */
            cameraMake: string,

            /**
             * Model of the camera with which the photo was taken.
             */
            cameraModel: string,

            /**
             * Focal length of the camera lens with which the photo was taken.
             */
            focalLength: number,

            /**
             * Aperture f number of the camera lens with which the photo was taken.
             */
            apertureFNumber: number,

            /**
             * ISO of the camera with which the photo was taken.
             */
            isoEquivalent: number,

            /**
             * Exposure time of the camera aperture when the photo was taken.
             * 
             * A duration in seconds with up to nine fractional digits, terminated by 's'. Example: "3.5s"
             */
            exposureTime: string
        },

        video?: {
            /**
             * Brand of the camera with which the video was taken.
             */
            cameraMake: string,
            
            /**
             * Model of the camera with which the video was taken.
             */
            cameraModel: string,
            
            /**
             * Frame rate of the video.
             */
            fps: number,

            /**
             * Processing status of the video.
             */
            status: VideoProcessingStatus
        }
        // End of list of possible types for union field metadata.
    }

    /**
     * Information about the user who added the media item. Note that this information is included only if the media item is within a shared album created by your app and you have the sharing scope.
     */
    interface ContributorInfo {
        /**
         * URL to the profile picture of the contributor.
         */
        profilePictureBaseUrl: string,

        /**
         * Display name of the contributor.
         */
        displayName: string
    }

    interface MediaItem {
        /**
         * Identifier for the media item. This is a persistent identifier that can be used between sessions to identify this media item.
         */
        id: string,

        /**
         * Description of the media item. This is shown to the user in the item's info section in the Google Photos app. Must be shorter than 1000 characters. Only include text written by users. Descriptions should add context and help users understand media. Do not include any auto-generated strings such as filenames, tags, and other metadata.
         */
        description: string,
        
        /**
         * Google Photos URL for the media item. This link is available to the user only if they're signed in. When retrieved from an album search, the URL points to the item inside the album.
         */
        productUrl: string,
        
        /**
         * A URL to the media item's bytes. This shouldn't be used as is. Parameters should be appended to this URL before use. See the developer documentation for a complete list of supported parameters. For example, '=w2048-h1024' will set the dimensions of a media item of type photo to have a width of 2048 px and height of 1024 px.
         */
        baseUrl: string,

        /**
         * MIME type of the media item. For example, image/jpeg.
         */
        mimeType: string,

        /**
         * Metadata related to the media item, such as, height, width, or creation time.
         */
        mediaMetadata: MediaMetadata,

        /**
         * Information about the user who added this media item. Note that this is only included when using mediaItems.search with the ID of a shared album. The album must be created by your app and you must have the sharing scope.
         */
        contributorInfo?: ContributorInfo,

        /**
         * Filename of the media item. This is shown to the user in the item's info section in the Google Photos app.
         */
        filename: string
    }

    interface MediaItemList {
        /**
         * Output only. List of media items that match the search parameters.
         */
        mediaItems: MediaItem[],

        /**
         * Output only. Use this token to get the next set of media items. Its presence is the only reliable indicator of more media items being available in the next request.
         */
        nextPageToken?: string
    }
}