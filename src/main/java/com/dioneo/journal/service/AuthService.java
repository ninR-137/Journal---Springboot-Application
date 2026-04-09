package com.dioneo.journal.service;

import com.dioneo.journal.dto.RegisterRequest;
import com.dioneo.journal.entities.User;

public interface AuthService {
    User register(RegisterRequest registrationRequest);
}
