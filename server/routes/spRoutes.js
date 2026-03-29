const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');
const { encrypt, decrypt, maskSecret } = require('../utils/crypto');

// All routes protected
router.use(protect);

// @route   POST /api/service-principal/add
// @desc    Add a new Service Principal (encrypts the secret)
router.post('/add', async (req, res) => {
  const { clientId, tenantId, clientSecret } = req.body;

  if (!clientId || !tenantId || !clientSecret) {
    return res.status(400).json({ error: 'clientId, tenantId, and clientSecret are required' });
  }

  try {
    const user = await User.findById(req.user._id);

    // Prevent exact duplicates (same clientId AND same secret)
    const isDuplicate = user.servicePrincipals.some(sp => {
      if (sp.clientId === clientId) {
        const existingSecret = decrypt(sp.clientSecretEnc);
        if (existingSecret === clientSecret) {
          return true;
        }
      }
      return false;
    });

    if (isDuplicate) {
      return res.status(409).json({ error: 'This exact Service Principal (same ID & Secret) already exists' });
    }

    const clientSecretEnc = encrypt(clientSecret);

    user.servicePrincipals.push({
      clientId,
      tenantId,
      clientSecretEnc,
      isActive: false,
    });

    await user.save();

    const added = user.servicePrincipals[user.servicePrincipals.length - 1];
    res.status(201).json({
      message: 'Service Principal added',
      sp: {
        _id: added._id,
        clientId: added.clientId,
        tenantId: added.tenantId,
        maskedSecret: maskSecret(added.clientSecretEnc),
        isActive: added.isActive,
        createdAt: added.createdAt,
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add Service Principal' });
  }
});

// @route   GET /api/service-principal/list
// @desc    List all Service Principals (secrets masked)
router.get('/list', async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    const list = user.servicePrincipals.map(sp => ({
      _id: sp._id,
      clientId: sp.clientId,
      tenantId: sp.tenantId,
      maskedSecret: maskSecret(sp.clientSecretEnc),
      isActive: sp.isActive,
      createdAt: sp.createdAt,
    }));

    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch Service Principals' });
  }
});

// @route   POST /api/service-principal/connect
// @desc    Set one SP as active, deactivate all others, and return credentials to trigger scan
router.post('/connect', async (req, res) => {
  const { spId } = req.body;

  if (!spId) {
    return res.status(400).json({ error: 'spId is required' });
  }

  try {
    const user = await User.findById(req.user._id);

    const target = user.servicePrincipals.id(spId);
    if (!target) {
      return res.status(404).json({ error: 'Service Principal not found' });
    }

    // Deactivate all, then activate target
    user.servicePrincipals.forEach(sp => { sp.isActive = false; });
    target.isActive = true;

    await user.save();
    
    // Return the decrypted credentials so the frontend can trigger the actual Azure scan
    res.json({ 
      message: `Service Principal ${target.clientId} is now active`,
      credentials: {
        tenantId: target.tenantId,
        clientId: target.clientId,
        clientSecret: decrypt(target.clientSecretEnc)
      }
    });
  } catch (err) {

    res.status(500).json({ error: 'Failed to connect Service Principal' });
  }
});

// @route   DELETE /api/service-principal/:id
// @desc    Delete a Service Principal
router.delete('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    const sp = user.servicePrincipals.id(req.params.id);
    if (!sp) {
      return res.status(404).json({ error: 'Service Principal not found' });
    }

    user.servicePrincipals.pull(req.params.id);
    await user.save();

    res.json({ message: 'Service Principal deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete Service Principal' });
  }
});

// @route   POST /api/service-principal/reset-active
// @desc    Deactivate all Service Principals for the current user
router.post('/reset-active', async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    let changed = false;
    user.servicePrincipals.forEach(sp => { 
      if (sp.isActive) {
        sp.isActive = false; 
        changed = true;
      }
    });

    if (changed) {
      await user.save();
    }
    
    res.json({ message: 'All Service Principals have been deactivated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reset active Service Principals' });
  }
});

module.exports = router;
