import api from "./api";

interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  password_confirm: string;
  first_name: string;
  last_name: string;
}

interface AuthResponse {
  access: string;
  refresh: string;
  user: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    is_active: boolean;
  };
}

interface UserProfileResponse {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Frontend-facing functions with simple parameter names
export const login = async (
  usernameOrEmail: string,
  password: string
): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>("/auth/login/", {
    username: usernameOrEmail,
    password,
  });

  const { access, refresh } = response.data;
  localStorage.setItem("access_token", access);
  localStorage.setItem("refresh_token", refresh);

  return response.data;
};

export const register = async (
  data: RegisterRequest
): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>("/auth/register/", {
    email: data.email,
    username: data.username,
    password: data.password,
    password_confirm: data.password_confirm,
    first_name: data.first_name,
    last_name: data.last_name,
  });

  const { access, refresh } = response.data;
  localStorage.setItem("access_token", access);
  localStorage.setItem("refresh_token", refresh);

  return response.data;
};

export const getProfile = async (): Promise<UserProfileResponse> => {
  const response = await api.get<UserProfileResponse>("/auth/profile/");
  return response.data;
};

export const updateProfile = async (
  data: Partial<UserProfileResponse>
): Promise<UserProfileResponse> => {
  const response = await api.patch<UserProfileResponse>("/auth/profile/", data);
  return response.data;
};

export const changePassword = async (
  oldPassword: string,
  newPassword: string
): Promise<{ detail: string }> => {
  const response = await api.post<{ detail: string }>(
    "/auth/profile/change_password/",
    {
      old_password: oldPassword,
      new_password: newPassword,
    }
  );
  return response.data;
};

export const logout = async (): Promise<void> => {
  try {
    await api.post("/auth/logout/");
  } finally {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
  }
};

export const getAccessToken = (): string | null => {
  return localStorage.getItem("access_token");
};

export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem("access_token");
};

const authService = {
  login,
  register,
  getProfile,
  updateProfile,
  changePassword,
  logout,
  getAccessToken,
  isAuthenticated,
};

export default authService;
