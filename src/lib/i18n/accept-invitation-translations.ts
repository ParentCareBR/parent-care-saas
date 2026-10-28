export type AcceptInviteLocale = 'pt-BR' | 'en' | 'es' | 'fr' | 'de';

export interface AcceptInviteTranslations {
  checkingInvitation: string;
  invitationUnavailable: string;
  askAdminNewInvite: string;
  goToLogin: string;
  welcomeTitleElderly: string;
  welcomeTitleFamily: string;
  familyPrefix: string;
  defaultWelcomeMessage: string;
  accountLoginEmail: string;
  yourFullName: string;
  fullNamePlaceholder: string;
  preferredLanguage: string;
  createPersonalPassword: string;
  onlyYouWillKnow: string;
  passwordPlaceholder: string;
  confirmYourPassword: string;
  confirmPasswordPlaceholder: string;
  termsReadAndAgree: string;
  termsOfUse: string;
  termsAnd: string;
  privacyPolicy: string;
  privacyProtected: string;
  biometricsSupported: string;
  submitButton: string;
  submittingButton: string;
  errPasswordLength: string;
  errPasswordMismatch: string;
  errTermsRequired: string;
  errLoadInvite: string;
  errActivate: string;
  errActivateFail: string;
}

export const ACCEPT_INVITE_I18N: Record<AcceptInviteLocale, AcceptInviteTranslations> = {
  'pt-BR': {
    checkingInvitation: 'Verificando seu convite...',
    invitationUnavailable: 'Convite Indisponível',
    askAdminNewInvite: 'Por favor, solicite ao administrador da sua família que envie um novo convite.',
    goToLogin: 'Ir para a página de entrada',
    welcomeTitleElderly: 'Bem-vindo(a) ao seu Parent Care!',
    welcomeTitleFamily: 'Convite da Família',
    familyPrefix: 'Família:',
    defaultWelcomeMessage: 'Olá! Criei seu acesso pessoal no Parent Care para você acompanhar suas rotinas e se divertir com os jogos.',
    accountLoginEmail: 'E-mail de login da conta:',
    yourFullName: 'Seu Nome Completo',
    fullNamePlaceholder: 'Ex: Dona Maria Silva',
    preferredLanguage: 'Idioma de Sua Preferência',
    createPersonalPassword: 'Crie sua Senha Pessoal',
    onlyYouWillKnow: 'Só você saberá',
    passwordPlaceholder: 'Mínimo 8 caracteres',
    confirmYourPassword: 'Confirme sua Senha',
    confirmPasswordPlaceholder: 'Repita a senha',
    termsReadAndAgree: 'Li e concordo com os',
    termsOfUse: 'Termos de Uso',
    termsAnd: 'e com a',
    privacyPolicy: 'Política de Privacidade',
    privacyProtected: '. Seus dados estão protegidos conforme a LGPD.',
    biometricsSupported: 'Seu dispositivo suporta biometria. Você poderá usá-la nas próximas entradas.',
    submitButton: '✓ Concluir e Entrar',
    submittingButton: 'Ativando sua conta...',
    errPasswordLength: 'A senha deve ter pelo menos 8 caracteres.',
    errPasswordMismatch: 'As senhas não coincidem. Digite a mesma senha nos dois campos.',
    errTermsRequired: 'É obrigatório aceitar os termos de uso e política de privacidade.',
    errLoadInvite: 'Erro ao carregar convite.',
    errActivate: 'Erro ao ativar conta.',
    errActivateFail: 'Falha ao ativar conta.',
  },
  'en': {
    checkingInvitation: 'Checking your invitation...',
    invitationUnavailable: 'Invitation Unavailable',
    askAdminNewInvite: 'Please ask your family administrator to send a new invitation.',
    goToLogin: 'Go to sign-in page',
    welcomeTitleElderly: 'Welcome to your Parent Care!',
    welcomeTitleFamily: 'Family Invitation',
    familyPrefix: 'Family:',
    defaultWelcomeMessage: 'Hello! I created your personal access on Parent Care so you can follow your routines and have fun with the games.',
    accountLoginEmail: 'Account login email:',
    yourFullName: 'Your Full Name',
    fullNamePlaceholder: 'e.g. Mary Smith',
    preferredLanguage: 'Your Preferred Language',
    createPersonalPassword: 'Create your Personal Password',
    onlyYouWillKnow: 'Only you will know',
    passwordPlaceholder: 'Minimum 8 characters',
    confirmYourPassword: 'Confirm your Password',
    confirmPasswordPlaceholder: 'Repeat password',
    termsReadAndAgree: 'I have read and agree to the',
    termsOfUse: 'Terms of Use',
    termsAnd: 'and the',
    privacyPolicy: 'Privacy Policy',
    privacyProtected: '. Your data is protected in accordance with privacy laws (GDPR/LGPD).',
    biometricsSupported: 'Your device supports biometrics. You can use it for future logins.',
    submitButton: '✓ Finish and Sign In',
    submittingButton: 'Activating your account...',
    errPasswordLength: 'Password must be at least 8 characters.',
    errPasswordMismatch: 'Passwords do not match. Please enter the same password in both fields.',
    errTermsRequired: 'You must accept the terms of use and privacy policy.',
    errLoadInvite: 'Error loading invitation.',
    errActivate: 'Error activating account.',
    errActivateFail: 'Failed to activate account.',
  },
  'es': {
    checkingInvitation: 'Verificando su invitación...',
    invitationUnavailable: 'Invitación no disponible',
    askAdminNewInvite: 'Por favor, solicite al administrador de su familia que le envíe una nueva invitación.',
    goToLogin: 'Ir a la página de inicio',
    welcomeTitleElderly: '¡Bienvenido(a) a tu Parent Care!',
    welcomeTitleFamily: 'Invitación de la Familia',
    familyPrefix: 'Familia:',
    defaultWelcomeMessage: '¡Hola! He creado tu acceso personal en Parent Care para que puedas seguir tus rutinas y divertirte con los juegos.',
    accountLoginEmail: 'Correo de inicio de sesión:',
    yourFullName: 'Tu Nombre Completo',
    fullNamePlaceholder: 'Ej: Doña María Silva',
    preferredLanguage: 'Idioma de tu Preferencia',
    createPersonalPassword: 'Crea tu Contraseña Personal',
    onlyYouWillKnow: 'Solo tú lo sabrás',
    passwordPlaceholder: 'Mínimo 8 caracteres',
    confirmYourPassword: 'Confirma tu Contraseña',
    confirmPasswordPlaceholder: 'Repite la contraseña',
    termsReadAndAgree: 'He leído y acepto los',
    termsOfUse: 'Términos de Uso',
    termsAnd: 'y la',
    privacyPolicy: 'Política de Privacidad',
    privacyProtected: '. Sus datos están protegidos conforme a las leyes de privacidad (RGPD/LGPD).',
    biometricsSupported: 'Tu dispositivo admite biometría. Podrás usarla en futuros inicios de sesión.',
    submitButton: '✓ Concluir y Entrar',
    submittingButton: 'Activando tu cuenta...',
    errPasswordLength: 'La contraseña debe tener al menos 8 caracteres.',
    errPasswordMismatch: 'Las contraseñas no coinciden. Escribe la misma contraseña en ambos campos.',
    errTermsRequired: 'Es obligatorio aceptar los términos de uso y la política de privacidad.',
    errLoadInvite: 'Error al cargar la invitación.',
    errActivate: 'Error al activar la cuenta.',
    errActivateFail: 'Fallo al activar la cuenta.',
  },
  'fr': {
    checkingInvitation: 'Vérification de votre invitation...',
    invitationUnavailable: 'Invitation non disponible',
    askAdminNewInvite: 'Veuillez demander à l\'administrateur de votre famille d\'envoyer une nouvelle invitation.',
    goToLogin: 'Aller à la page de connexion',
    welcomeTitleElderly: 'Bienvenue sur votre Parent Care !',
    welcomeTitleFamily: 'Invitation de la Famille',
    familyPrefix: 'Famille :',
    defaultWelcomeMessage: 'Bonjour ! J\'ai créé votre accès personnel sur Parent Care pour que vous puissiez suivre vos routines et vous amuser avec les jeux.',
    accountLoginEmail: 'E-mail de connexion au compte :',
    yourFullName: 'Votre Nom Complet',
    fullNamePlaceholder: 'Ex : Mme Marie Dubois',
    preferredLanguage: 'Langue de votre Choix',
    createPersonalPassword: 'Créez votre Mot de Passe Personnel',
    onlyYouWillKnow: 'Vous seul le saurez',
    passwordPlaceholder: 'Minimum 8 caractères',
    confirmYourPassword: 'Confirmez votre Mot de Passe',
    confirmPasswordPlaceholder: 'Répétez le mot de passe',
    termsReadAndAgree: 'J\'ai lu et j\'accepte les',
    termsOfUse: 'Conditions d\'utilisation',
    termsAnd: 'et la',
    privacyPolicy: 'Politique de confidentialité',
    privacyProtected: '. Vos données sont protégées conformément au RGPD.',
    biometricsSupported: 'Votre appareil prend en charge la biométrie. Vous pourrez l\'utiliser lors des prochaines connexions.',
    submitButton: '✓ Terminer et se connecter',
    submittingButton: 'Activation de votre compte...',
    errPasswordLength: 'Le mot de passe doit comporter au moins 8 caractères.',
    errPasswordMismatch: 'Les mots de passe ne correspondent pas. Entrez le même mot de passe dans les deux champs.',
    errTermsRequired: 'Il est obligatoire d\'accepter les conditions d\'utilisation et la politique de confidentialité.',
    errLoadInvite: 'Erreur lors du chargement de l\'invitation.',
    errActivate: 'Erreur lors de l\'activation du compte.',
    errActivateFail: 'Échec de l\'activation du compte.',
  },
  'de': {
    checkingInvitation: 'Einladung wird überprüft...',
    invitationUnavailable: 'Einladung nicht verfügbar',
    askAdminNewInvite: 'Bitte bitten Sie den Administrator Ihrer Familie, eine neue Einladung zu senden.',
    goToLogin: 'Zur Anmeldeseite gehen',
    welcomeTitleElderly: 'Willkommen bei Ihrem Parent Care!',
    welcomeTitleFamily: 'Familieneinladung',
    familyPrefix: 'Familie:',
    defaultWelcomeMessage: 'Hallo! Ich habe Ihren persönlichen Zugang zu Parent Care erstellt, damit Sie Ihre Routinen verfolgen und Spaß mit den Spielen haben können.',
    accountLoginEmail: 'E-Mail für Konto-Login:',
    yourFullName: 'Ihr Vollständiger Name',
    fullNamePlaceholder: 'z. B. Frau Maria Schmidt',
    preferredLanguage: 'Ihre Bevorzugte Sprache',
    createPersonalPassword: 'Erstellen Sie Ihr persönliches Passwort',
    onlyYouWillKnow: 'Nur Sie werden es wissen',
    passwordPlaceholder: 'Mindestens 8 Zeichen',
    confirmYourPassword: 'Passwort bestätigen',
    confirmPasswordPlaceholder: 'Passwort wiederholen',
    termsReadAndAgree: 'Ich habe die',
    termsOfUse: 'Nutzungsbedingungen',
    termsAnd: 'und die',
    privacyPolicy: 'Datenschutzerklärung',
    privacyProtected: ' gelesen und stimme ihnen zu. Ihre Daten sind gemäß DSGVO geschützt.',
    biometricsSupported: 'Ihr Gerät unterstützt Biometrie. Sie können sie bei künftigen Anmeldungen verwenden.',
    submitButton: '✓ Abschließen und Einloggen',
    submittingButton: 'Konto wird aktiviert...',
    errPasswordLength: 'Das Passwort muss mindestens 8 Zeichen lang sein.',
    errPasswordMismatch: 'Die Passwörter stimmen nicht überein. Geben Sie in beiden Feldern dasselbe Passwort ein.',
    errTermsRequired: 'Die Zustimmung zu den Nutzungsbedingungen und der Datenschutzerklärung ist erforderlich.',
    errLoadInvite: 'Fehler beim Laden der Einladung.',
    errActivate: 'Fehler beim Aktivieren des Kontos.',
    errActivateFail: 'Fehler beim Aktivieren des Kontos.',
  },
};

export function getAcceptInviteTranslations(lang?: string): AcceptInviteTranslations {
  if (!lang) return ACCEPT_INVITE_I18N['pt-BR'];
  const normalized = (lang.startsWith('pt') ? 'pt-BR' : lang.split('-')[0]) as AcceptInviteLocale;
  return ACCEPT_INVITE_I18N[normalized] || ACCEPT_INVITE_I18N['pt-BR'];
}
