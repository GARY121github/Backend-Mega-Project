import { Router } from 'express';
const router = Router();
import { registerUser, loginUser, logoutUser, refreshAccessToken, changeCurrentPassword, getCurrentUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage } from '../controllers/user.controller.js';
import { upload } from '../middlewares/multer.middleware.js';
import { verifyJWT } from '../middlewares/auth.middleware.js'


router.route('/register').post(
    upload.fields([
        {
            name: 'avatar',
            maxCount: 1
        },
        {
            name: 'coverImage',
            maxCount: 1
        }
    ]),
    registerUser);

router.route('/login').post(loginUser);

router.route('/logout').post(verifyJWT, logoutUser);

router.route('/refresh-token').post(verifyJWT, refreshAccessToken);

router.route('/change-password').post(verifyJWT, changeCurrentPassword);

router.route('/current-user').get(verifyJWT, getCurrentUser);

router.route('/update-account').patch(verifyJWT, updateAccountDetails);

router.route('/avatar').patch(
    verifyJWT,
    upload.single("avatar"),
    updateUserAvatar
)

router.route('/cover-image').patch(
    verifyJWT,
    upload.single("coverImage"),
    updateUserCoverImage
);



export default router;