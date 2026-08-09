const statusMessages: Record<number, string> = {
  400: 'La demande est invalide. Vérifiez les informations saisies.',
  401: 'Votre session a expiré. Veuillez vous reconnecter.',
  403: 'Vous n\'avez pas les droits nécessaires pour effectuer cette action.',
  404: 'La ressource demandée est introuvable.',
  409: 'Conflit de données : la ressource existe peut-être déjà.',
  413: 'Le fichier est trop volumineux. Taille maximale autorisée : 10 Mo.',
  422: 'Les données envoyées sont invalides.',
  500: 'Une erreur interne est survenue. Veuillez réessayer plus tard.',
  502: 'Le service est temporairement indisponible. Réessayez plus tard.',
  503: 'Le service est temporairement indisponible. Réessayez plus tard.',
  504: 'Le service est temporairement indisponible. Réessayez plus tard.'
};

export function getErrorMessage(error: any, fallback?: string): string {
  const backendMessage = error?.error?.message;
  if (typeof backendMessage === 'string' && backendMessage.trim().length > 0) {
    return backendMessage;
  }
  const status = error?.status;
  if (typeof status === 'number' && statusMessages[status]) {
    return statusMessages[status];
  }
  if (status === undefined || status === null) {
    return 'Impossible de contacter le serveur. Vérifiez votre connexion.';
  }
  return fallback ?? 'Une erreur est survenue. Veuillez réessayer.';
}
