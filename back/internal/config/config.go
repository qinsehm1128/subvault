package config

import "os"

type Config struct {
	JWTSecret    string
	DatabasePath string
	Environment  string
}

func Load() *Config {
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "subvault-dev-secret-change-in-production"
	}

	dbPath := os.Getenv("DATABASE_PATH")
	if dbPath == "" {
		dbPath = "./data/subvault.db"
	}

	env := os.Getenv("ENV")
	if env == "" {
		env = "development"
	}

	return &Config{
		JWTSecret:    jwtSecret,
		DatabasePath: dbPath,
		Environment:  env,
	}
}
