package dev.html2apk.bridge;

import android.content.Context;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;

public class LightSensorManager {
    private SensorManager sensorManager;
    private Sensor lightSensor;
    private SensorEventListener sensorEventListener;
    private LightSensorCallback callback;

    public interface LightSensorCallback {
        void onLightChanged(float lux);
    }

    public LightSensorManager(Context context, LightSensorCallback callback) {
        this.callback = callback;
        sensorManager = (SensorManager) context.getSystemService(Context.SENSOR_SERVICE);
        if (sensorManager != null) {
            lightSensor = sensorManager.getDefaultSensor(Sensor.TYPE_LIGHT);
        }
    }

    public void start() {
        if (sensorManager != null && lightSensor != null && sensorEventListener == null) {
            sensorEventListener = new SensorEventListener() {
                @Override
                public void onSensorChanged(SensorEvent event) {
                    if (event.values != null && event.values.length > 0) {
                        float lux = event.values[0];
                        if (callback != null) {
                            callback.onLightChanged(lux);
                        }
                    }
                }

                @Override
                public void onAccuracyChanged(Sensor sensor, int accuracy) {
                }
            };
            sensorManager.registerListener(sensorEventListener, lightSensor, SensorManager.SENSOR_DELAY_NORMAL);
        }
    }

    public void stop() {
        if (sensorManager != null && sensorEventListener != null) {
            sensorManager.unregisterListener(sensorEventListener);
            sensorEventListener = null;
        }
    }
}
