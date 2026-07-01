import * as userRepository from "../repositories/userRepository.js";

export async function saveUser(user, insights) {
  return userRepository.saveUser(user, insights);
}

export async function getAllUsers(options) {
  return userRepository.findAllUsers(options);
}

export async function getLocalUser(username) {
  return userRepository.findUserByLogin(username);
}

export async function getStoredUser(username) {
  return userRepository.findStoredUser(username);
}

export async function getAnalyticsSummary() {
  return userRepository.getAnalyticsSummary();
}

export async function getTopInfluencers(limit) {
  return userRepository.getTopInfluencers(limit);
}

export async function searchByLanguage(language) {
  return userRepository.searchByLanguage(language);
}
